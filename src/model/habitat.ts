import { IRange } from "../algorithm/algorithm.js";
import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

const MIN_DERIVED_DEMAND_FACTOR = 100;

export const HABITAT_UNIT_DEMAND = new Map([
    [Model.Product.Food, 10],
    [Model.Product.Drink, 10],
    [Model.Product.Apparel, 10],
    [Model.Product.Medicine, 10],
    [Model.Product.Accessory, 5],
    [Model.Product.Furniture, 5],
    [Model.Product.Gadget, 5],
    [Model.Product.Vehicle, 5],
]);

export class Habitat implements
    Model.IBankAccount,
    Model.IHasMarket {

    private happiness = 0; // from 0 to 1
    private taxRate = 0; // from 0 to 1
    private numEmployed = 0; // <= workforce

    private inventories = new Map<Model.HasInventory, Model.Inventory>();

    // temp variable
    private aggDemand = new Map<Model.Product, number>();

    constructor(
        public readonly id: number,
        private home: Model.ColonizableT,
        private population: number,
        private market: Model.Market,
    ) { }

    public getHome() {
        return this.home;
    }

    public getInventory(who: Model.HasInventory) {
        return Algo.getOrSet(this.inventories, who, () => new Model.Inventory());
    }

    public onBankrupt() {
        console.log(`bankrupt: ${this}`);
        // TODO? maybe start a recession
    }

    public assetWorth() {
        return Infinity; // TODO
    }

    public getPopulation() {
        return this.population;
    }

    public growthRate() {
        return (this.getHappiness() - 0.3) * 0.1 / 120;
    }

    public getHappiness() {
        return this.happiness;
    }

    public getCitizenDemand(product: Model.Product) {
        if (this.id === 5 && product === Model.Product.Machine) {
            return 100;
        }
        const unitDemand = Algo.getQty(HABITAT_UNIT_DEMAND, product);
        return Math.round(unitDemand * this.getPopulation());
    }

    public isProducing(galaxy: Model.Galaxy, product: Model.Product) {
        return Array
            .from(this.inventories.values())
            .some((x) => x.isProducing(galaxy, product));
    }

    public hasDemand(galaxy: Model.Galaxy, product: Model.Product) {
        return this.getDemand(galaxy, product) > 0;
    }

    public getDemand(galaxy: Model.Galaxy, product: Model.Product) {
        const base = this.getCitizenDemand(product);
        return base;
    }

    public getAggDemand(galaxy: Model.Galaxy, product: Model.Product) {
        return Algo.getQty(this.aggDemand, product) + this.getDemand(galaxy, product);
    }

    public fixedPrice(product: Model.Product) {
        return undefined; // totally demand-supply driven
    }

    public tryEmploy(preferred: number) {
        console.assert(preferred >= 0);
        if (this.numEmployed >= preferred) {
            this.numEmployed -= preferred;
            return preferred;
        } else {
            const employed = this.numEmployed;
            this.numEmployed = 0;
            return employed;
        }
    }

    public unemploy(num: number) {
        console.assert(this.numEmployed >= num);
        this.numEmployed -= num;
    }

    public recalculate(galaxy: Model.Galaxy) {
        this.consume(galaxy);
        this.growth();

        for (const product of Model.allProducts()) {
            const demand = Array
                .from(this.inventories.values())
                .reduce((acc, x) => acc + x.getDemand(galaxy, product), 0);
            this.aggDemand.set(product, demand);
        }
    }

    public getProdCap(galaxy: Model.Galaxy, product: Model.Product) {
        let sum = 0;
        for (const inventory of this.inventories.values()) {
            sum += inventory.getProdCap(galaxy, product);
        }
        return sum;
    }

    public trade(galaxy: Model.Galaxy) {

        const market = this.market;

        for (const [owner, inventory] of this.inventories) {

            for (const product of Model.allProducts()) {
                const qty = inventory.getQty(product);
                const demand = inventory.getDemand(galaxy, product);
                const ownerInv = this.getInventory(owner);
                if (qty > demand) {
                    const surplus = qty - demand;
                    market.tryBuy(galaxy, ownerInv, owner, product, surplus, 0);
                } else if (qty < demand) {
                    const deficit = demand - qty;
                    market.trySell(galaxy, ownerInv, owner, product, deficit, Infinity);
                }
            }
        }
    }

    public getWorkforce() {
        return Math.ceil(this.population * 0.6); // at least 1 population must work
    }

    public getMarket() {
        return this.market;
    }

    private growth() {
        const rate = this.growthRate();
        this.population = Math.max(1, this.population * (1 + rate));
    }

    private consume(galaxy: Model.Galaxy) {
        const inventory = this.market.getInventory();

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

        const allConsumption = new Map(Model
            .allProducts()
            .map((product) => [product, consume1(product)] as [Model.Product, number]));

        const commonHappiness = Algo.average(
            allConsumption.get(Model.Product.Food)!,
            allConsumption.get(Model.Product.Drink)!,
            allConsumption.get(Model.Product.Apparel)!,
            allConsumption.get(Model.Product.Medicine)!,
        );

        const luxuryHappiness = Algo.average(
            allConsumption.get(Model.Product.Accessory)!,
            allConsumption.get(Model.Product.Furniture)!,
            allConsumption.get(Model.Product.Gadget)!,
            allConsumption.get(Model.Product.Vehicle)!,
        );

        // this.happiness = commonHappiness * 0.7 + luxuryHappiness * 0.3;
        this.happiness = allConsumption.get(Model.Product.Food)!;
    }
}
