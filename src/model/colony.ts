import * as Immutable from "immutable";
import { average, sum, toIt } from "myalgo-ts";
import assert from "../utils/assert";
import { Galaxy } from "./galaxy";
import { Industry } from "./industry";
import { Inventory } from "./inventory";
import { Planet } from "./planet";
import { allProducts, NUM_PRODUCTS, Product } from "./product";
import { YEAR_PER_TICK } from ".";

const POWER_POTENTIAL = 200;
const PRICE_EXP_LOW = 0.7;
const PRICE_EXP_HIGH = 1.3;
const DAYS_KEEP_GOODS = 10; // number of days to keep consumption
const MIN_PRICE_PERCENT = 0.4; // percent of the base price

const COLONY_UNIT_DEMAND = (() => {
  const ret = new Array<number>(NUM_PRODUCTS).fill(0);
  ret[Product.Food] = 10;
  ret[Product.Drink] = 10;
  ret[Product.Apparel] = 10;
  ret[Product.Medicine] = 10;
  ret[Product.Accessory] = 5;
  ret[Product.Furniture] = 5;
  ret[Product.Gadget] = 5;
  ret[Product.Vehicle] = 5;
  return ret;
})();

export interface IColony {
  commonHappiness: number;
  foodHappiness: number;
  homePlanetId: number;
  id: number;
  isLockPopulation: boolean;
  luxuryHappiness: number;
  marketInventoryId: number;
  maxPopulation: number;
  playerInventoryId: number;
  population: number;
  powerOutputEff: number;
  powerPlanetLevel: number;
}

export class Colony {
  public static estimatePrice(
    demand: number,
    supply: number,
    elasticity: number,
    basePrice: number
  ): number {
    assert(elasticity > 0);

    // returns ratio in [0,2]
    const ratio =
      demand === 0
        ? PRICE_EXP_LOW // this makes 0-demand goods $1
        : supply === 0
        ? PRICE_EXP_HIGH
        : Math.min(PRICE_EXP_HIGH, demand / supply);

    // score ranges in (0,Math.pow(2,elasticity)]
    const score = Math.pow(ratio, elasticity);
    const price = basePrice * score;
    assert(Number.isFinite(price));

    return price;
  }

  public static elasticity(product: Product): number {
    switch (product) {
      case Product.Crop:
      case Product.Metal:
      case Product.Gem:
      case Product.Fuel:
        return 1;
      case Product.Food:
        return 1.5; // very elastic
      case Product.Drink:
      case Product.Apparel:
      case Product.Medicine:
        return 1;
      case Product.Accessory:
      case Product.Furniture:
      case Product.Gadget:
      case Product.Vehicle:
        return 0.4;
      case Product.Fiber: // intermediate
      case Product.Chemical:
      case Product.Circuit:
      case Product.Computer:
      case Product.Machine:
      case Product.Tool:
        return 1.5;
    }
  }

  public static basePrice(product: Product): number {
    switch (product) {
      case Product.Crop: // raw materials
      case Product.Metal:
      case Product.Gem:
      case Product.Fuel:
      case Product.Fiber: // intermediate
      case Product.Chemical:
      case Product.Circuit:
      case Product.Computer:
        return 1;
      case Product.Machine: // operational
      case Product.Tool:
        return 2;
      case Product.Accessory: // luxury
      case Product.Furniture:
      case Product.Gadget:
      case Product.Vehicle:
        return 4;
      case Product.Food: // basic
      case Product.Drink:
      case Product.Apparel:
      case Product.Medicine:
        return 1.5;
    }
  }
  private derivedDemands = new Array<Product>(NUM_PRODUCTS).fill(0);

  constructor(
    public readonly id: number,
    private homePlanet: Planet,
    private population: number,
    private playerInventory: Inventory,
    private marketInventory: Inventory,
    private maxPopulation = 100,
    private isLockPopulation = false,
    private powerPlanetLevel = 0,
    private powerOutputEff = 0,
    private foodHappiness = 0,
    private luxuryHappiness = 0,
    private commonHappiness = 0
  ) {}

  public serialize(): IColony {
    return {
      commonHappiness: this.commonHappiness,
      foodHappiness: this.foodHappiness,
      homePlanetId: this.homePlanet.id,
      id: this.id,
      isLockPopulation: this.isLockPopulation,
      luxuryHappiness: this.luxuryHappiness,
      marketInventoryId: this.marketInventory.id,
      maxPopulation: this.maxPopulation,
      playerInventoryId: this.playerInventory.id,
      population: this.population,
      powerOutputEff: this.powerOutputEff,
      powerPlanetLevel: this.powerPlanetLevel,
    };
  }

  public getHomePlanet(): Planet {
    return this.homePlanet;
  }

  public getPlayerInventory(): Inventory {
    return this.playerInventory;
  }

  public getMarketInventory(): Inventory {
    return this.marketInventory;
  }

  public getPopulation(): number {
    return this.population;
  }

  public getMaxPop(): number {
    return Math.ceil(this.maxPopulation);
  }

  public growthRate(galaxy: Galaxy): number {
    const baseGrowth = 0.1;

    if (this.foodHappiness < 1) {
      return this.foodHappiness - 1; // starve to death
    }

    const common = 1 + this.commonHappiness;

    // luxuary bonus only applies when common goods demands are fullfilled
    const luxury = common === 1 ? 1 + this.luxuryHappiness : 1;

    const energyUsage = 1 + this.getPowerUsageEff(galaxy);

    return energyUsage * common * luxury * baseGrowth;
  }

  public getTraderPowerUsage(galaxy: Galaxy): number {
    let numTraders = 0;
    const tos = galaxy.getTradeRoutes().get(this);

    if (tos !== undefined) {
      for (const to of tos) {
        numTraders += galaxy.getNumUsedTraders(this, to);
      }
    }

    return numTraders;
  }

  public getIndustrialPowerUsage(galaxy: Galaxy): number {
    const industries = galaxy.tryGetIndustries(this);
    if (industries === undefined) {
      return 0;
    }
    return sum(...toIt(industries).map((industry) => industry.getPowerUsage()));
  }

  public getCivilianPowerUsage(): number {
    return Math.round(this.population * 10);
  }

  public getTotalPowerUsage(
    galaxy: Galaxy
  ): {
    industrialUsage: number;
    traderUsage: number;
    civUsage: number;
    totalUsage: number;
  } {
    const industrialUsage = this.getIndustrialPowerUsage(galaxy);
    const traderUsage = this.getTraderPowerUsage(galaxy);
    const civUsage = this.getCivilianPowerUsage();
    const totalUsage = industrialUsage + traderUsage + civUsage;
    return { industrialUsage, traderUsage, civUsage, totalUsage };
  }

  public getPowerUsageEff(galaxy: Galaxy): number {
    const { totalUsage: usage } = this.getTotalPowerUsage(galaxy);
    const output = this.getPowerOutput();
    if (usage === 0) {
      return output > 0 ? 0 : 1;
    }
    return Math.min(1, output / usage);
  }

  public getPowerOutputEff(): number {
    return this.powerOutputEff;
  }

  public getPowerOutput(): number {
    return Math.round(this.getMaxPowerPotential() * this.getPowerOutputEff());
  }

  public getEnergyPrice(galaxy: Galaxy): number {
    const { totalUsage: demand } = this.getTotalPowerUsage(galaxy);
    const supply = this.getPowerOutput();
    return Colony.estimatePrice(
      demand,
      supply,
      1,
      Colony.basePrice(Product.Fuel)
    );
  }

  public getMaxPowerPotential(): number {
    return this.powerPlanetLevel * POWER_POTENTIAL + 50;
  }

  public getFuelDemand(): number {
    return this.getMaxPowerPotential();
  }

  public getPowerPlanetLevel(): number {
    return this.powerPlanetLevel;
  }

  public getCitizenDemand(product: Product): number {
    switch (product) {
      case Product.Fuel:
        return this.getFuelDemand();
      default: {
        const unitDemand = COLONY_UNIT_DEMAND[product];
        return Math.round(unitDemand * this.getPopulation());
      }
    }
  }

  public isProducing(galaxy: Galaxy, product: Product): boolean {
    const industries = galaxy.tryGetIndustries(this);
    return (
      industries !== undefined &&
      toIt(industries).some((industry) => industry.productType === product)
    );
  }

  public hasDemand(product: Product): boolean {
    return this.getDemand(product) > 0;
  }

  public getDemand(product: Product): number {
    const base = this.getCitizenDemand(product);
    const derived = this.derivedDemands[product];
    return base + derived;
  }

  public getSupply(product: Product): number {
    return this.marketInventory.getQty(product);
  }

  public recalculate(galaxy: Galaxy): void {
    this.consume();
    this.growth(galaxy);

    this.derivedDemands.fill(0);
    const industries = galaxy.tryGetIndustries(this);

    if (industries === undefined) {
      return;
    }

    for (const industry of industries) {
      const prodCap = industry.prodCap(galaxy);
      Immutable.Seq(Industry.getDemandProducts(industry.productType))
        .map((x) => {
          return {
            neededKinds: x,
            qty: prodCap,
          };
        })
        .concat(industry.getOpDemand())
        .forEach((demand) => {
          for (const product of demand.neededKinds) {
            this.derivedDemands[product] += demand.qty;
          }
        });
    }
  }

  public canExpandPowerPlant(galaxy: Galaxy): boolean {
    const { totalUsage } = this.getTotalPowerUsage(galaxy);
    return 2 * totalUsage > this.getMaxPowerPotential();
  }

  public expandPowerPlanet(galaxy: Galaxy): void {
    assert(this.canExpandPowerPlant(galaxy));
    this.powerPlanetLevel += 1;
  }

  public getProdCap(galaxy: Galaxy, product: Product): number {
    const industries = galaxy.tryGetIndustries(this);
    if (industries === undefined) {
      return 0;
    }
    return sum(
      ...toIt(industries)
        .filter((industry) => industry.productType === product)
        .map((industry) => industry.prodCap(galaxy))
    );
  }

  public trade(galaxy: Galaxy): void {
    const playerInventory = this.playerInventory;

    for (const product of allProducts()) {
      const qty = playerInventory.getQty(product);
      const demand = playerInventory.getDemand(galaxy, product);
      if (qty > demand) {
        const surplus = qty - demand;
        this.tryBuy(galaxy, playerInventory, product, surplus, 0);
      } else if (qty < demand) {
        const deficit = demand - qty;
        this.trySell(galaxy, playerInventory, product, deficit, Infinity, true);
      }
    }
  }

  public lockPopulation(isLock?: boolean): boolean {
    if (isLock !== undefined) {
      this.isLockPopulation = isLock;
    }
    return this.isLockPopulation;
  }

  public getPrice(product: Product): number {
    const supply = this.marketInventory.getQty(product);
    return this.realPrice(product, supply);
  }

  public realPrice(product: Product, supply: number): number {
    const demand = this.getDemand(product); // galaxy.getGalacticDemands(product);

    const basePrice = Colony.basePrice(product);
    const elasticity = Colony.elasticity(product);
    const est = Colony.estimatePrice(demand, supply, elasticity, basePrice);
    assert(est >= 0);
    const minPrice = MIN_PRICE[product];
    assert(Number.isFinite(minPrice));
    return Math.max(minPrice, est);
  }

  public tryBuy(
    galaxy: Galaxy,
    fromInventory: Inventory,
    product: Product,
    maxQty: number,
    minPrice: number
  ): number {
    assert(maxQty >= 0);

    const marketInventory = this.marketInventory;
    const marketQty = marketInventory.getQty(product);

    let bought = 0;
    let cost = 0;
    for (;;) {
      const newMarketQty = marketQty + bought;
      const price = this.realPrice(product, newMarketQty);
      assert(price > 0);
      if (maxQty === bought || price < minPrice) {
        break;
      }
      ++bought;
      cost += price;
    }
    if (bought > 0) {
      fromInventory.takeGoods(product, bought);
      marketInventory.putGoods(product, bought);
      galaxy.deposit(cost);
    }
    return bought;
  }

  public trySell(
    galaxy: Galaxy,
    toInventory: Inventory,
    product: Product,
    maxQty: number,
    maxPrice: number,
    isInternalBuyer = false
  ): void {
    assert(maxQty >= 0);

    const marketInventory = this.marketInventory;
    const marketQty = marketInventory.getQty(product);

    const minStockQty = this.minStockQty(galaxy, product);

    let cost = 0;
    let sold = 0;
    for (;;) {
      const newMarketQty = marketQty - sold;
      assert(newMarketQty >= 0);
      const price = this.realPrice(product, newMarketQty);
      if (
        maxQty === sold ||
        price > maxPrice ||
        newMarketQty === 0 ||
        !toInventory.hasSpaceFor(sold) ||
        (!isInternalBuyer && newMarketQty <= minStockQty) // cannot sell below the "safety line" to traders
      ) {
        break;
      }
      ++sold;
      cost += price;
    }
    if (sold > 0) {
      marketInventory.takeGoods(product, sold);
      toInventory.putGoods(product, sold);
      galaxy.withdraw(cost);
    }
  }

  public getDeficit(galaxy: Galaxy, product: Product): number {
    const market = this.marketInventory;
    const qty = market.getQty(product);
    const keep = this.minStockQty(galaxy, product);
    return qty < keep ? keep - qty : 0;
  }

  private minStockQty(galaxy: Galaxy, product: Product): number {
    const baseDemand = this.getDemand(product);

    // if the colony is producing the target goods, then keep only 1 day worth of goods for local consumption
    if (this.isProducing(galaxy, product)) {
      return baseDemand;
    }
    return DAYS_KEEP_GOODS * baseDemand;
  }

  private growth(galaxy: Galaxy): void {
    const rate = this.growthRate(galaxy) / YEAR_PER_TICK;
    const next = Math.max(1, this.population * (1 + rate));

    const maxPop = this.isLockPopulation ? this.population : this.getMaxPop();
    const diff = next - maxPop;

    if (diff > 0) {
      // if population growth is positive & is growing beyond cap
      this.population = maxPop;
      galaxy.addColonists(diff); // excess population becomes colonists
    } else {
      this.population = Math.min(next, maxPop);
    }
  }

  private consume(): void {
    const inventory = this.marketInventory;

    const consume1 = (product: Product) => {
      const qty = inventory.getQty(product);
      const demand = Math.floor(this.getCitizenDemand(product));
      if (demand === 0) {
        return 1;
      }
      const consumed = qty >= demand ? demand : qty;
      inventory.takeGoods(product, consumed);

      return consumed / demand;
    };

    const allConsumption = allProducts().map((product) => consume1(product));

    this.commonHappiness = average(
      allConsumption[Product.Drink],
      allConsumption[Product.Apparel],
      allConsumption[Product.Medicine]
    );

    this.luxuryHappiness = average(
      allConsumption[Product.Accessory],
      allConsumption[Product.Furniture],
      allConsumption[Product.Gadget],
      allConsumption[Product.Vehicle]
    );

    this.foodHappiness = allConsumption[Product.Food];

    const fEff = allConsumption[Product.Fuel];
    this.powerOutputEff = fEff * fEff; // fEff squared
  }
}

// needs to be placed after Colony for webpack'ed bundle to work
const MIN_PRICE = allProducts().map((product) => {
  const basePrice = Colony.basePrice(product);
  const elasticity = Colony.elasticity(product);
  return Math.pow(MIN_PRICE_PERCENT * basePrice, elasticity);
});
