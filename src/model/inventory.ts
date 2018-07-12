import * as Immutable from "immutable";
import * as Model from ".";
import { sum } from "../../node_modules/myalgo-ts";
import { Product } from "./product";

export interface IInventory {
    id: number;
    inventory: number[];
    maxStorage: number;
}

export class Inventory {

    // either generated on the fly or restored from some source
    private demandSrcs: Model.Industry[] = [];
    private usedSpace = sum(...this.inventory);

    constructor(
        public readonly id: number,
        private maxStorage = Infinity,
        private inventory = new Array<number>(Model.NUM_PRODUCTS).fill(0),
    ) {
        console.assert(this.usedSpace <= maxStorage);
    }

    public serialize(): Model.IInventory {
        return {
            id: this.id,
            inventory: this.inventory,
            maxStorage: this.maxStorage,
        };
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
        const qty = this.inventory[productType];
        console.assert(qty >= 0);
        return qty;
    }

    public putGoods(productType: Model.Product, qty: number): number {
        console.assert(qty >= 0);
        console.assert(Number.isInteger(qty));
        const inStock = this.inventory[productType];
        const newQty = Math.min(this.maxStorage - this.usedSpace, qty);
        const newTotal = inStock + newQty;
        this.inventory[productType] = newTotal;
        this.usedSpace += newQty;
        return newTotal;
    }

    public takeGoods(productType: Model.Product, qty: number): number {
        console.assert(qty >= 0);
        console.assert(Number.isInteger(qty));

        const remain = this.inventory[productType] - qty;
        if (remain < 0) {
            throw new Error("bug: responsibility of maintaining non-negative quantity goes to the caller");
        }

        this.inventory[productType] = remain;
        this.usedSpace -= qty;
        return remain;
    }

    public hasSpaceFor(qty: number) {
        console.assert(qty >= 0);
        return this.maxStorage >= this.usedSpace + qty;
    }

    public addDemandSrc(demandSrc: Model.Industry) {
        this.demandSrcs.push(demandSrc);
    }

    public getDemand(galaxy: Model.Galaxy, product: Model.Product): number {
        const demands = new Array<number>(Model.NUM_PRODUCTS).fill(0);
        for (const src of this.demandSrcs) {

            const prodCap = src.prodCap(galaxy);

            const allDemands = Immutable
                .Seq(Model.Industry.getDemandProducts(src.productType))
                .map((x) => {
                    return {
                        neededKinds: x,
                        qty: prodCap,
                    };
                }).concat(src.getOpDemand());

            for (const demand of allDemands) {
                if (!demand.neededKinds.has(product)) {
                    continue;
                }
                // try to fill alternatives demands
                let need = demand.qty;
                for (const kind of demand.neededKinds) {
                    const qty = this.getQty(kind);
                    if (qty > need) {
                        demands[kind] += need;
                        break;
                    } else {
                        need -= qty;
                        demands[kind] += qty;
                    }
                }
                console.assert(need >= 0);
                // fill remaining needs with the target product
                demands[product] += need;
            }
        }

        return demands[product];
    }

    public *getAllQty() {
        const it = this.inventory
            .map((qty, idx) => [idx, qty] as [Product, number]);
        for (const pair of it) {
            // any entry must have qty >= 0
            console.assert(pair[1] >= 0);
            yield pair;
        }
    }

    public consume(products: Set<Model.Product> | Immutable.Set<Model.Product>, qty: number) {
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
