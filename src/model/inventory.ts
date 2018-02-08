import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

const INVENTORY_FULL_SCALE = 0.8; // 0.8 is considered full

export class Inventory {

    private usedSpace = Algo.sum(...this.inventory.values());
    private demandSrcs: Model.IProducer[] = [];

    constructor(
        private maxStorage: number = Infinity,

        // either generated on the fly or restored from some source
        private inventory = new Map<Model.Product, number>(),
    ) {
        console.assert(this.usedSpace <= maxStorage);
    }

    public setMaxStorage(maxStorage: number) {
        console.assert(!Number.isNaN(maxStorage));
        console.assert(maxStorage > 0); // allow Infinity
        this.maxStorage = maxStorage;
    }

    public getEmptySpace() {
        const space = this.maxStorage - this.usedSpace;
        console.assert(space >= 0);
        return space;
    }

    public getMaxSpace() {
        return this.maxStorage;
    }

    public getQty(productType: Model.Product) {
        const qty = Algo.getQty(this.inventory, productType);
        console.assert(qty >= 0);
        return qty;
    }

    public putGoods(productType: Model.Product, qty: number): number {
        console.assert(qty >= 0);
        Number.isInteger(qty);
        const inStock = Algo.getQty(this.inventory, productType);
        const newQty = Math.min(this.maxStorage - this.usedSpace, qty);
        const newTotal = inStock + newQty;
        this.inventory.set(productType, newTotal);
        this.usedSpace += newQty;
        return newTotal;
    }

    public takeGoods(productType: Model.Product, qty: number): number {
        console.assert(qty >= 0);
        Number.isInteger(qty);

        const remain = Algo.getQty(this.inventory, productType) - qty;
        if (remain < 0) {
            throw new Error("bug: responsibility of maintaining non-negative quantity goes to the caller");
        }

        if (remain === 0) {
            this.inventory.delete(productType);
        } else {
            this.inventory.set(productType, remain);
        }
        this.usedSpace -= qty;
        return remain;
    }

    public hasSpaceFor(qty: number) {
        console.assert(qty >= 0);
        return this.maxStorage >= this.usedSpace + qty;
    }

    public addDemandSrc(demandSrc: Model.IProducer) {
        this.demandSrcs.push(demandSrc);
    }

    public isProducing(galaxy: Model.Galaxy, product: Model.Product) {
        return this.demandSrcs
            .filter((src) => src.productType === product)
            .some((src) => src.prodCap(galaxy) > 0);
    }

    public getProdCap(galaxy: Model.Galaxy, product: Model.Product) {
        return Algo.sum(...this.demandSrcs
            .filter((src) => src.productType === product)
            .map((src) => src.prodCap(galaxy)));
    }

    public getDemand(galaxy: Model.Galaxy, product: Model.Product): number {
        const demands = new Map<Model.Product, number>();
        for (const src of this.demandSrcs) {

            const prodCap = src.prodCap(galaxy);

            const allDemands = Algo.combineIt(Array
                .from(Model.Industry
                    .getDemandProducts(src.productType))
                .map((x) => {
                    return {
                        neededKinds: x,
                        qty: prodCap,
                    };
                }),
                src.getOpDemand(galaxy));

            for (const demand of allDemands) {
                if (!demand.neededKinds.has(product)) {
                    continue;
                }
                // try to fill alternatives demands
                let need = demand.qty;
                for (const kind of demand.neededKinds) {
                    const qty = this.getQty(kind);
                    if (qty > need) {
                        Algo.getAndSum(demands, kind, need);
                        break;
                    } else {
                        need -= qty;
                        Algo.getAndSum(demands, kind, qty);
                    }
                }
                console.assert(need >= 0);
                // fill remaining needs with the target product
                Algo.getAndSum(demands, product, need);
            }
        }

        return Algo.getQty(demands, product);
    }

    public *getAllQty() {
        for (const [product, qty] of this.inventory) {
            // any entry must have qty > 0
            yield [product, qty] as [Model.Product, number];
        }
    }

    public consume(products: Set<Model.Product>, qty: number) {
        console.assert(qty >= 0);

        const sorted = Array
            .from(products)
            // sort by descending order
            .sort((a, b) => this.getQty(b) - this.getQty(a));

        // try to consume products with the highest stock qty
        let consumed = qty;
        for (const product of sorted) {
            const inStock = this.getQty(product);
            if (consumed > inStock) {
                this.takeGoods(product, inStock);
                consumed -= inStock;
            } else {
                this.takeGoods(product, consumed);
                consumed = 0;
                break; // consumed everything needed
            }
        }
        return qty - consumed;
    }
}
