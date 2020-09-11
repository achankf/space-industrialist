import * as Immutable from "immutable";
import { Colony } from "./colony";
import { Galaxy } from "./galaxy";
import { Inventory } from "./inventory";
import {
  DEMAND_PRODUCTS,
  FLAT_DEMAND_PRODUCTS,
  IOpDemand,
  Product,
} from "./product";
const BASE_YIELD = 10;
const MAX_OP_PRODUCTS = 10;
const MIN_OP_EFF = 0.1;
const REMAIN_CHANGE_EFF_FACTOR = 0.8; // i.e. 20% eff loss when upgrading/down-sizing industrial complex
const BASE_FIXED_COST = 0.3;
const MIN_FIXED_COST = 0.03;
const FIXED_COST_OFFSET = BASE_FIXED_COST - MIN_FIXED_COST;
console.assert(FIXED_COST_OFFSET > 0);

const BASE_POWER_USAGE = 10;

// bonus production modifiers
const OP_FACTOR_BONUS = 4;
const ENERGY_BONUS = 4;

export interface IIndustry {
  colonyId: number;
  id: number;
  operationalEff: number;
  productType: Product;
  scale: number;
}

export class Industry {
  public static getDemandProducts(productType: Product): Set<Product>[] {
    return DEMAND_PRODUCTS[productType];
  }

  public static getFlatDemandProducts(
    productType: Product
  ): Immutable.Set<Product> {
    return FLAT_DEMAND_PRODUCTS[productType];
  }

  constructor(
    public readonly id: number,
    public readonly productType: Product,
    public readonly colony: Colony,
    private scale = 1,
    private operationalEff = MIN_OP_EFF // 0.1 to 1
  ) {}

  public serialize = (): IIndustry => ({
    colonyId: this.colony.id,
    id: this.id,
    operationalEff: this.operationalEff,
    productType: this.productType,
    scale: this.scale,
  });

  public upgrade(): void {
    ++this.scale;
    this.operationalEff = Math.max(
      MIN_OP_EFF,
      REMAIN_CHANGE_EFF_FACTOR * this.operationalEff
    );
  }

  public downSize(): void {
    this.scale = Math.max(1, this.scale - 1);
    this.operationalEff = Math.max(
      MIN_OP_EFF,
      REMAIN_CHANGE_EFF_FACTOR * this.operationalEff
    );
  }

  public getScale(): number {
    return this.scale;
  }

  public operate(galaxy: Galaxy): void {
    const isRunProd = this.isRunProd(galaxy);

    const playerInventory = this.colony.getPlayerInventory();

    let numProduced = 0;
    if (isRunProd) {
      numProduced = this.produce(galaxy, playerInventory);
    }

    numProduced = Math.max(1, numProduced);
    const costPerUnit = this.getCostPerUnit();
    const prodCost = costPerUnit * numProduced;
    const energyCost =
      this.usedEnergy(galaxy) + this.colony.getEnergyPrice(galaxy);

    galaxy.withdraw(prodCost + energyCost);

    this.updateModifers(isRunProd, playerInventory);
  }

  public getCostPerUnit(): number {
    const costReduction = 1 - this.operationalEff;
    console.assert(costReduction >= 0 && costReduction <= 1);
    return MIN_FIXED_COST + FIXED_COST_OFFSET * costReduction;
  }

  public usedEnergy(galaxy: Galaxy): number {
    return this.getPowerUsage() * this.colony.getPowerUsageEff(galaxy);
  }

  public getOpDemand(): IOpDemand {
    const qty = MAX_OP_PRODUCTS * this.scale;
    switch (this.productType) {
      case Product.Crop:
      case Product.Metal:
      case Product.Gem:
      case Product.Fuel:
        return {
          neededKinds: new Set([Product.Tool]),
          qty,
        };
      default:
        // post-processing industries
        return {
          neededKinds: new Set([Product.Machine]),
          qty,
        };
    }
  }

  public prodCap(galaxy: Galaxy): number {
    const operationalFactor = 1 + this.operationalEff * OP_FACTOR_BONUS;
    const energyBonus = 1 + this.colony.getPowerUsageEff(galaxy) * ENERGY_BONUS;
    return Math.max(
      1,
      Math.ceil(this.scale * BASE_YIELD * operationalFactor * energyBonus)
    );
  }

  public getOperationalEff(): number {
    return this.operationalEff;
  }

  public getPowerUsage(): number {
    return this.getScale() * BASE_POWER_USAGE;
  }

  private isRunProd(galaxy: Galaxy): boolean {
    const productType = this.productType;
    const demandQty = 10 * galaxy.getGalacticDemands(productType);
    const supplyQty = this.colony.getSupply(productType);

    const playerInventory = this.colony.getPlayerInventory();
    const inStock = playerInventory.getQty(this.productType);

    // produce when there's excess demand
    return demandQty > inStock + supplyQty;
  }

  private updateModifers(isRunProd: boolean, inventory: Inventory): void {
    const opDemand = this.getOpDemand();

    const consumed = inventory.consume(opDemand.neededKinds, opDemand.qty);
    const ratio = consumed / opDemand.qty;
    if (!isRunProd || ratio < 0.5) {
      // not running production or too few tools, penatly
      this.operationalEff = Math.max(MIN_OP_EFF, this.operationalEff - 0.001);
    } else {
      const consumptionFactor = (ratio - 0.5) / 0.5;
      this.operationalEff = Math.min(
        1,
        this.operationalEff + 0.01 * consumptionFactor
      );
    }
  }

  private produce(galaxy: Galaxy, inventory: Inventory): number {
    const demandProducts = Industry.getFlatDemandProducts(this.productType);
    const prodCap = this.prodCap(galaxy);

    if (demandProducts.size === 0) {
      // no input requirement, produce full production capacity
      inventory.putGoods(this.productType, prodCap);
      return prodCap;
    }

    const produceQty = Math.min(
      prodCap, // note: cannot produce greater than the production capacity
      ...demandProducts.map((product) => inventory.getQty(product))
    );
    for (const demandGroup of Industry.getDemandProducts(this.productType)) {
      const consumed = inventory.consume(demandGroup, produceQty);
      console.assert(consumed === produceQty);
    }
    inventory.putGoods(this.productType, produceQty);

    return produceQty;
  }
}
