import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";
import { Product } from "./model.js";

const BASE_YIELD = 10;
const MAX_OP_PRODUCTS = 10;

export class Industry implements Model.IProducer {

    public static getDemandProducts(productType: Model.Product): Array<Set<Product>> {
        switch (productType) {
            case Product.Crop:
            case Product.Metal:
            case Product.Gem:
            case Product.Fuel:
                return [];
            case Product.Food:
                return [new Set([Product.Crop])];
            case Product.Drink:
                return [new Set([Product.Crop])];
            case Product.Apparel:
                return [new Set([Product.Fiber])];
            case Product.Medicine:
                return [new Set([Product.Chemical])];
            case Product.Fiber:
                return [new Set([Product.Crop])];
            case Product.Chemical:
                return [new Set([
                    Product.Crop,
                    Product.Metal,
                    Product.Gem,
                    Product.Fuel,
                ])];
            case Product.Circuit:
                return [new Set([Product.Metal])];
            case Product.Computer:
                return [new Set([Product.Circuit])];
            case Product.Accessory:
                return [new Set([Product.Gem])];
            case Product.Furniture:
                return [new Set([Product.Fiber])];
            case Product.Gadget:
                return [new Set([Product.Computer])];
            case Product.Vehicle:
                return [new Set([Product.Metal])];
            case Product.Concrete:
                return [new Set([Product.Metal])];
            case Product.Machine:
                return [
                    new Set([Product.Metal]),
                    new Set([Product.Computer]),
                ];
            case Product.Tool:
                return [new Set([Product.Metal])];
            case Product.Supply:
                return [
                    new Set([Product.Food]),
                    new Set([Product.Drink]),
                    new Set([Product.Apparel]),
                    new Set([Product.Medicine]),
                ];
            default:
                // throw new Error("not handled");
                return [];
        }
    }

    private operationalEff = 0; // 0 to 1
    private runningEff = 0; // 0 to 1

    constructor(
        public readonly id: number,
        public readonly productType: Product,
        public readonly home: Model.Habitat,
        private inventory: Model.Inventory,
        private scale = 1,
    ) { }

    public upgrade() {
        const prev = this.scale;
        ++this.scale;
        this.operationalEff = this.operationalEff * prev / this.scale;
        this.runningEff = this.runningEff * prev / this.scale;
    }

    public downSize() {
        this.scale = Math.max(1, this.scale + 1);
    }

    public getScale() {
        return this.scale;
    }

    public operate(galaxy: Model.Galaxy) {

        const isRunProd = this.isRunProd(galaxy);

        const companyInventory = this.inventory;

        if (isRunProd) {
            this.produce(galaxy, companyInventory);
            // bonus efficiency for producing goods
            this.runningEff = Math.min(1, this.runningEff + 0.0002);
        } else {
            // penalty for not producing goods
            this.runningEff = Math.min(1, this.runningEff + 0.0001);
        }

        this.updateModifers(galaxy, isRunProd, companyInventory);
    }

    public getOpDemand(galaxy: Model.Galaxy): Model.IOpDemand[] {
        switch (this.productType) {
            case Product.Crop:
            case Product.Metal:
            case Product.Gem:
            case Product.Fuel:
                return [{
                    neededKinds: new Set([Product.Tool]),
                    qty: MAX_OP_PRODUCTS,
                    modifierKind: Model.IndustryModifier.OperationalBonus,
                }];
            default: // post-processing industries
                return [{
                    neededKinds: new Set([Product.Machine]),
                    qty: MAX_OP_PRODUCTS,
                    modifierKind: Model.IndustryModifier.OperationalBonus,
                }];
        }
    }

    public prodCap(galaxy: Model.Galaxy) {
        const operationalFactor = this.operationalEff * 10;
        const runningBonusYield = 1 + this.runningEff;
        const baseProdCap = Math.pow(BASE_YIELD, runningBonusYield);
        return Math.max(1, this.scale * Math.ceil(baseProdCap * operationalFactor));
    }

    public getRunningEff() {
        return this.runningEff;
    }

    public getOperationalEff() {
        return this.operationalEff;
    }

    private isRunProd(galaxy: Model.Galaxy) {
        const productType = this.productType;
        const demandQty = galaxy.getGalacticDemands(productType);
        const supplyQty = galaxy.getGalacticSupplies(productType);
        const inStock = this.inventory.getQty(this.productType);

        // produce when there's excess demand
        return demandQty > inStock + supplyQty;
    }

    private updateModifers(galaxy: Model.Galaxy, isRunProd: boolean, inventory: Model.Inventory) {

        for (const opDemand of this.getOpDemand(galaxy)) {

            const consumed = inventory.consume(opDemand.neededKinds, opDemand.qty);
            const ratio = consumed / opDemand.qty;
            switch (opDemand.modifierKind) {
                case Model.IndustryModifier.OperationalBonus:
                    {
                        if (!isRunProd || ratio < 0.5) {
                            // not running production or too few tools, penatly
                            this.operationalEff = Math.max(0.1, this.operationalEff - 0.0001);
                        } else {
                            const consumptionFactor = (ratio - 0.5) / 0.5;
                            this.operationalEff = Math.min(1, this.operationalEff + 0.001 * consumptionFactor);
                        }
                    }
                    break;
                default:
                    throw new Error("not handled");
            }
        }
    }

    private produce(galaxy: Model.Galaxy, inventory: Model.Inventory) {

        const demandProducts = Industry.getDemandProducts(this.productType);
        const prodCap = this.prodCap(galaxy);

        if (demandProducts.length === 0) {
            // no input requirement, produce full production capacity
            inventory.putGoods(this.productType, prodCap);
        } else {
            const produceQty = Math.min(
                prodCap, // note: cannot produce greater than the production capacity
                ...demandProducts
                    .map((group) => Array
                        .from(group)
                        .reduce((acc, cur) => acc + inventory.getQty(cur), 0)));
            for (const demandGroup of demandProducts) {
                const consumed = inventory.consume(demandGroup, produceQty);
                console.assert(consumed === produceQty);
            }
            inventory.putGoods(this.productType, produceQty);
        }
    }

}
