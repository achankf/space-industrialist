import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

const PRICE_EXP_LOW = 0.7;
const PRICE_EXP_HIGH = 1.3;

export class Market {

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
        const price = Math.pow(basePrice, score);
        console.assert(Number.isFinite(price));

        return price;
    }

    public static elasticity(product: Model.Product) {
        switch (product) {
            case Model.Product.Food:
            case Model.Product.Drink:
            case Model.Product.Apparel:
            case Model.Product.Medicine:
                return 1;
            case Model.Product.Accessory:
            case Model.Product.Furniture:
            case Model.Product.Gadget:
            case Model.Product.Vehicle:
                return 0.7;
            case Model.Product.Fiber: // intermediate
            case Model.Product.Chemical:
            case Model.Product.Circuit:
            case Model.Product.Computer:
            case Model.Product.Concrete: // operational
            case Model.Product.Machine:
            case Model.Product.Tool:
            case Model.Product.Supply:
                return 0.3;
            default:
                return 1;
        }
    }

    public static basePrice(product: Model.Product) {
        switch (product) {
            case Model.Product.Crop:
            case Model.Product.Metal:
            case Model.Product.Gem:
            case Model.Product.Fuel:
                return 1.1;
            case Model.Product.Fiber: // intermediate
            case Model.Product.Chemical:
            case Model.Product.Circuit:
            case Model.Product.Computer:
            case Model.Product.Concrete: // operational
            case Model.Product.Machine:
            case Model.Product.Tool:
            case Model.Product.Supply:
                return 2;
            case Model.Product.Accessory:
            case Model.Product.Furniture:
            case Model.Product.Gadget:
            case Model.Product.Vehicle:
                return 3;
            case Model.Product.Food:
            case Model.Product.Drink:
            case Model.Product.Apparel:
            case Model.Product.Medicine:
                return 2;
            default:
                return 7;
        }
    }

    private inventory = new Model.Inventory();

    constructor(
        public readonly id: number,
    ) { }

    public getInventory() {
        return this.inventory;
    }

    public getProdCap(galaxy: Model.Galaxy, product: Model.Product) {
        return Algo.sum(...galaxy.getMarketSrcs()
            .get(this)!
            .map((src) => src.getProdCap(galaxy, product)));
    }

    public getDemand(galaxy: Model.Galaxy, product: Model.Product) {
        return Algo.sum(...galaxy.getMarketSrcs()
            .get(this)!
            .map((src) => src.getDemand(galaxy, product)));
    }

    public getAggDemand(galaxy: Model.Galaxy, product: Model.Product) {
        return Algo.sum(...galaxy.getMarketSrcs()
            .get(this)!
            .map((src) => src.getAggDemand(galaxy, product)));
    }

    public getDeficit(galaxy: Model.Galaxy, product: Model.Product) {
        const market = this.inventory;
        const qty = market.getQty(product);
        const keep = this.getAggDemand(galaxy, product);
        return qty < keep ? keep - qty : 0;
    }

    public * getAllDeficit(galaxy: Model.Galaxy) {
        const market = this.inventory;
        for (const product of Model.allProducts()) {
            const qty = market.getQty(product);
            const keep = this.getAggDemand(galaxy, product);
            if (qty < keep) {
                yield [product, keep - qty] as [Model.Product, number];
            }
        }
    }

    public getPrice(galaxy: Model.Galaxy, product: Model.Product) {
        const supply = this.inventory.getQty(product);
        return this.realPrice(galaxy, product, supply);
    }

    public tryBuy(
        galaxy: Model.Galaxy,
        fromInventory: Model.Inventory,
        fromAccount: Model.IBankAccount,
        product: Model.Product,
        maxQty: number,
        minPrice: number,
    ) {

        console.assert(maxQty >= 0);

        const marketInventory = this.inventory;
        const bank = galaxy.getBank();

        let bought = 0;
        let cost = 0;
        while (true) {
            const price = this.getPrice(galaxy, product);
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
            bank.deposit(fromAccount, cost);
        }
        return bought;
    }

    public trySell(
        galaxy: Model.Galaxy,
        toInventory: Model.Inventory,
        toAccount: Model.IBankAccount,
        product: Model.Product,
        maxQty: number,
        maxPrice: number,
    ) {

        console.assert(maxQty >= 0);

        const marketInventory = this.inventory;
        const marketQty = marketInventory.getQty(product);

        const demand = this.getDemand(galaxy, product);
        const bank = galaxy.getBank();

        let cost = 0;
        let sold = 0;
        while (true) {
            const price = this.getPrice(galaxy, product);
            if (
                maxQty === sold ||
                price > maxPrice ||
                !toInventory.hasSpaceFor(1) ||
                (marketQty - sold) <= demand // cannot sell below the "safety line"
            ) {
                break;
            }
            ++sold;
            cost += price;
        }
        if (sold > 0) {
            marketInventory.takeGoods(product, sold);
            toInventory.putGoods(product, sold);
            bank.withdraw(toAccount, cost);
        }
    }

    private realPrice(galaxy: Model.Galaxy, product: Model.Product, supply: number) {
        const demand = this.getAggDemand(galaxy, product);

        return Market.estimatePrice(
            demand,
            supply,
            Market.elasticity(product),
            Market.basePrice(product));
    }
}
