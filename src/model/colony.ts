import * as Immutable from "immutable";
import * as Model from ".";
import * as Algo from "../algorithm/algorithm";

const POWER_POTENTIAL = 200;
const PRICE_EXP_LOW = 0.7;
const PRICE_EXP_HIGH = 1.3;
const DAYS_KEEP_GOODS = 10; // number of days to keep consumption
const MIN_PRICE_PERCENT = 0.4; // percent of the base price

const COLONY_UNIT_DEMAND = (() => {
    const ret = new Array<number>(Model.NUM_PRODUCTS).fill(0);
    ret[Model.Product.Food] = 10;
    ret[Model.Product.Drink] = 10;
    ret[Model.Product.Apparel] = 10;
    ret[Model.Product.Medicine] = 10;
    ret[Model.Product.Accessory] = 5;
    ret[Model.Product.Furniture] = 5;
    ret[Model.Product.Gadget] = 5;
    ret[Model.Product.Vehicle] = 5;
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

    public static estimatePrice(demand: number, supply: number, elasticity: number, basePrice: number) {

        console.assert(elasticity > 0);

        // returns ratio in [0,2]
        const ratio = demand === 0 ?
            PRICE_EXP_LOW : // this makes 0-demand goods $1
            supply === 0 ?
                PRICE_EXP_HIGH :
                Math.min(PRICE_EXP_HIGH, demand / supply);

        // score ranges in (0,Math.pow(2,elasticity)]
        const score = Math.pow(ratio, elasticity);
        const price = basePrice * score;
        console.assert(Number.isFinite(price));

        return price;
    }

    public static elasticity(product: Model.Product) {
        switch (product) {
            case Model.Product.Crop:
            case Model.Product.Metal:
            case Model.Product.Gem:
            case Model.Product.Fuel:
                return 1;
            case Model.Product.Food:
                return 1.5; // very elastic
            case Model.Product.Drink:
            case Model.Product.Apparel:
            case Model.Product.Medicine:
                return 1;
            case Model.Product.Accessory:
            case Model.Product.Furniture:
            case Model.Product.Gadget:
            case Model.Product.Vehicle:
                return 0.4;
            case Model.Product.Fiber: // intermediate
            case Model.Product.Chemical:
            case Model.Product.Circuit:
            case Model.Product.Computer:
            // case Model.Product.Concrete: // operational
            case Model.Product.Machine:
            case Model.Product.Tool:
                return 1.5;
        }
    }

    public static basePrice(product: Model.Product) {
        switch (product) {
            case Model.Product.Crop: // raw materials
            case Model.Product.Metal:
            case Model.Product.Gem:
            case Model.Product.Fuel:
            case Model.Product.Fiber: // intermediate
            case Model.Product.Chemical:
            case Model.Product.Circuit:
            case Model.Product.Computer:
                return 1;
            case Model.Product.Machine: // operational
            case Model.Product.Tool:
                return 2;
            case Model.Product.Accessory: // luxury
            case Model.Product.Furniture:
            case Model.Product.Gadget:
            case Model.Product.Vehicle:
                return 4;
            case Model.Product.Food: // basic
            case Model.Product.Drink:
            case Model.Product.Apparel:
            case Model.Product.Medicine:
                return 1.5;
        }
    }
    private derivedDemands = new Array<Model.Product>(Model.NUM_PRODUCTS).fill(0);

    constructor(
        public readonly id: number,
        private homePlanet: Model.Planet,
        private population: number,
        private playerInventory: Model.Inventory,
        private marketInventory: Model.Inventory,
        private maxPopulation = 100,
        private isLockPopulation = false,
        private powerPlanetLevel = 0,
        private powerOutputEff = 0,
        private foodHappiness = 0,
        private luxuryHappiness = 0,
        private commonHappiness = 0,
    ) { }

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

    public getHomePlanet() {
        return this.homePlanet;
    }

    public getPlayerInventory() {
        return this.playerInventory;
    }

    public getMarketInventory() {
        return this.marketInventory;
    }

    public getPopulation() {
        return this.population;
    }

    public getMaxPop() {
        return Math.ceil(this.maxPopulation);
    }

    public growthRate(galaxy: Model.Galaxy) {
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

    public getTraderPowerUsage(galaxy: Model.Galaxy) {
        let numTraders = 0;
        const tos = galaxy.getTradeRoutes().get(this);

        if (tos !== undefined) {
            for (const to of tos) {
                numTraders += galaxy.getNumUsedTraders(this, to);
            }
        }

        return numTraders;
    }

    public getIndustrialPowerUsage(galaxy: Model.Galaxy) {
        return Algo.sum(...Immutable
            .Seq(galaxy.getIndustries(this))
            .map((industry) => industry.getPowerUsage()));
    }

    public getCivilianPowerUsage() {
        return Math.round(this.population * 10);
    }

    public getTotalPowerUsage(galaxy: Model.Galaxy) {
        const industrialUsage = this.getIndustrialPowerUsage(galaxy);
        const traderUsage = this.getTraderPowerUsage(galaxy);
        const civUsage = this.getCivilianPowerUsage();
        const totalUsage = industrialUsage + traderUsage + civUsage;
        return { industrialUsage, traderUsage, civUsage, totalUsage };
    }

    public getPowerUsageEff(galaxy: Model.Galaxy) {
        const { totalUsage: usage } = this.getTotalPowerUsage(galaxy);
        const output = this.getPowerOutput();
        if (usage === 0) {
            return output > 0 ? 0 : 1;
        }
        return Math.min(1, output / usage);
    }

    public getPowerOutputEff() {
        return this.powerOutputEff;
    }

    public getPowerOutput() {
        return Math.round(this.getMaxPowerPotential() * this.getPowerOutputEff());
    }

    public getEnergyPrice(galaxy: Model.Galaxy) {
        const { totalUsage: demand } = this.getTotalPowerUsage(galaxy);
        const supply = this.getPowerOutput();
        return Colony.estimatePrice(demand, supply, 1, Colony.basePrice(Model.Product.Fuel));
    }

    public getMaxPowerPotential() {
        return this.powerPlanetLevel * POWER_POTENTIAL + 50;
    }

    public getFuelDemand() {
        return this.getMaxPowerPotential();
    }

    public getPowerPlanetLevel() {
        return this.powerPlanetLevel;
    }

    public getCitizenDemand(product: Model.Product) {
        switch (product) {
            case Model.Product.Fuel:
                return this.getFuelDemand();
            default:
                const unitDemand = COLONY_UNIT_DEMAND[product];
                return Math.round(unitDemand * this.getPopulation());
        }
    }

    public isProducing(galaxy: Model.Galaxy, product: Model.Product) {
        for (const industry of galaxy.getIndustries(this)) {
            if (industry.productType === product) {
                return true;
            }
        }
        return false;
    }

    public hasDemand(product: Model.Product) {
        return this.getDemand(product) > 0;
    }

    public getDemand(product: Model.Product) {
        const base = this.getCitizenDemand(product);
        const derived = this.derivedDemands[product];
        return base + derived;
    }

    public getSupply(product: Model.Product) {
        return this.marketInventory.getQty(product);
    }

    public recalculate(galaxy: Model.Galaxy) {
        this.consume();
        this.growth(galaxy);

        this.derivedDemands.fill(0);
        for (const industry of galaxy.getIndustries(this)) {
            const prodCap = industry.prodCap(galaxy);
            Immutable
                .Seq(Model.Industry.getDemandProducts(industry.productType))
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

    public canExpandPowerPlant(galaxy: Model.Galaxy) {
        const { totalUsage } = this.getTotalPowerUsage(galaxy);
        return 2 * totalUsage > this.getMaxPowerPotential();
    }

    public expandPowerPlanet(galaxy: Model.Galaxy) {
        console.assert(this.canExpandPowerPlant(galaxy));
        this.powerPlanetLevel += 1;
    }

    public getProdCap(galaxy: Model.Galaxy, product: Model.Product) {
        return Algo.sum(...Immutable
            .Seq(galaxy.getIndustries(this))
            .filter((industry) => industry.productType === product)
            .map((industry) => industry.prodCap(galaxy)));
    }

    public trade(galaxy: Model.Galaxy) {

        const playerInventory = this.playerInventory;

        for (const product of Model.allProducts()) {
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

    public lockPopulation(isLock?: boolean) {
        if (isLock !== undefined) {
            this.isLockPopulation = isLock;
        }
        return this.isLockPopulation;
    }

    public getPrice(product: Model.Product) {
        const supply = this.marketInventory.getQty(product);
        return this.realPrice(product, supply);
    }

    public realPrice(product: Model.Product, supply: number) {
        const demand = this.getDemand(product); // galaxy.getGalacticDemands(product);

        const basePrice = Colony.basePrice(product);
        const elasticity = Colony.elasticity(product);
        const est = Colony.estimatePrice(
            demand,
            supply,
            elasticity,
            basePrice);
        console.assert(est >= 0);
        const minPrice = MIN_PRICE[product];
        console.assert(Number.isFinite(minPrice));
        return Math.max(minPrice, est);
    }

    public tryBuy(
        galaxy: Model.Galaxy,
        fromInventory: Model.Inventory,
        product: Model.Product,
        maxQty: number,
        minPrice: number,
    ) {

        console.assert(maxQty >= 0);

        const marketInventory = this.marketInventory;
        const marketQty = marketInventory.getQty(product);

        let bought = 0;
        let cost = 0;
        while (true) {
            const newMarketQty = marketQty + bought;
            const price = this.realPrice(product, newMarketQty);
            console.assert(price > 0);
            if (
                maxQty === bought ||
                price < minPrice
            ) {
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
        galaxy: Model.Galaxy,
        toInventory: Model.Inventory,
        product: Model.Product,
        maxQty: number,
        maxPrice: number,
        isInternalBuyer: boolean = false,
    ) {

        console.assert(maxQty >= 0);

        const marketInventory = this.marketInventory;
        const marketQty = marketInventory.getQty(product);

        const minStockQty = this.minStockQty(galaxy, product);

        let cost = 0;
        let sold = 0;
        while (true) {
            const newMarketQty = marketQty - sold;
            console.assert(newMarketQty >= 0);
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

    public getDeficit(galaxy: Model.Galaxy, product: Model.Product) {
        const market = this.marketInventory;
        const qty = market.getQty(product);
        const keep = this.minStockQty(galaxy, product);
        return qty < keep ? keep - qty : 0;
    }

    private minStockQty(galaxy: Model.Galaxy, product: Model.Product) {
        const baseDemand = this.getDemand(product);

        // if the colony is producing the target goods, then keep only 1 day worth of goods for local consumption
        if (this.isProducing(galaxy, product)) {
            return baseDemand;
        }
        return DAYS_KEEP_GOODS * baseDemand;
    }

    private growth(galaxy: Model.Galaxy) {
        const rate = this.growthRate(galaxy) / Model.YEAR_PER_TICK;
        const next = Math.max(1, this.population * (1 + rate));

        const maxPop = this.isLockPopulation ? this.population : this.getMaxPop();
        const diff = next - maxPop;

        if (diff > 0) { // if population growth is positive & is growing beyond cap
            this.population = maxPop;
            galaxy.addColonists(diff); // excess population becomes colonists
        } else {
            this.population = Math.min(next, maxPop);
        }
    }

    private consume() {
        const inventory = this.marketInventory;

        const consume1 = (product: Model.Product) => {
            const qty = inventory.getQty(product);
            const demand = Math.floor(this.getCitizenDemand(product));
            if (demand === 0) {
                return 1;
            }
            const consumed = qty >= demand ? demand : qty;
            inventory.takeGoods(product, consumed);

            return consumed / demand;
        };

        const allConsumption = Model
            .allProducts()
            .map((product) => consume1(product));

        this.commonHappiness = Algo.average(
            allConsumption[Model.Product.Drink],
            allConsumption[Model.Product.Apparel],
            allConsumption[Model.Product.Medicine],
        );

        this.luxuryHappiness = Algo.average(
            allConsumption[Model.Product.Accessory],
            allConsumption[Model.Product.Furniture],
            allConsumption[Model.Product.Gadget],
            allConsumption[Model.Product.Vehicle],
        );

        this.foodHappiness = allConsumption[Model.Product.Food];

        const fEff = allConsumption[Model.Product.Fuel];
        this.powerOutputEff = fEff * fEff; // fEff squared
    }
}

// needs to be placed after Colony for webpack'ed bundle to work
const MIN_PRICE = Model
    .allProducts()
    .map((product) => {
        const basePrice = Colony.basePrice(product);
        const elasticity = Colony.elasticity(product);
        return Math.pow(MIN_PRICE_PERCENT * basePrice, elasticity);
    });
