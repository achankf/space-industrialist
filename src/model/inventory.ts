import * as Immutable from "immutable";
import { sum } from "myalgo-ts";

import { assert } from "../utils/assert";
import { Galaxy } from "./galaxy";
import { Industry } from "./industry";
import { NUM_PRODUCTS, Product } from "./product";

export interface IInventory {
  id: number;
  inventory: number[];
  maxStorage: number;
}

export class Inventory {
  // either generated on the fly or restored from some source
  private demandSrcs: Industry[] = [];
  private usedSpace = sum(...this.inventory);

  constructor(
    public readonly id: number,
    private maxStorage = Infinity,
    private inventory = new Array<number>(NUM_PRODUCTS).fill(0)
  ) {
    assert(this.usedSpace <= maxStorage);
  }

  public serialize(): IInventory {
    return {
      id: this.id,
      inventory: this.inventory,
      maxStorage: this.maxStorage,
    };
  }

  public getEmptySpace(): number {
    const space = this.maxStorage - this.usedSpace;
    assert(space >= 0);
    return space;
  }

  public getMaxSpace(): number {
    return this.maxStorage;
  }

  public getQty(productType: Product): number {
    const qty = this.inventory[productType];
    assert(qty >= 0);
    return qty;
  }

  public putGoods(productType: Product, qty: number): number {
    assert(qty >= 0);
    assert(Number.isInteger(qty));
    const inStock = this.inventory[productType];
    const newQty = Math.min(this.maxStorage - this.usedSpace, qty);
    const newTotal = inStock + newQty;
    this.inventory[productType] = newTotal;
    this.usedSpace += newQty;
    return newTotal;
  }

  public takeGoods(productType: Product, qty: number): number {
    assert(qty >= 0);
    assert(Number.isInteger(qty));

    const remain = this.inventory[productType] - qty;
    if (remain < 0) {
      throw new Error(
        "bug: responsibility of maintaining non-negative quantity goes to the caller"
      );
    }

    this.inventory[productType] = remain;
    this.usedSpace -= qty;
    return remain;
  }

  public hasSpaceFor(qty: number): boolean {
    assert(qty >= 0);
    return this.maxStorage >= this.usedSpace + qty;
  }

  public addDemandSrc(demandSrc: Industry): void {
    this.demandSrcs.push(demandSrc);
  }

  public getDemand(galaxy: Galaxy, product: Product): number {
    const demands = new Array<number>(NUM_PRODUCTS).fill(0);
    for (const src of this.demandSrcs) {
      const prodCap = src.prodCap(galaxy);

      const allDemands = Industry.getDemandProducts(src.productType)
        .map((x) => {
          return {
            neededKinds: x,
            qty: prodCap,
          };
        })
        .concat(src.getOpDemand());

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
        assert(need >= 0);
        // fill remaining needs with the target product
        demands[product] += need;
      }
    }

    return demands[product];
  }

  public getAllQty(): [Product, number][] {
    return this.inventory.map((qty, idx) => [idx, qty]);
  }

  public consume(
    products: Set<Product> | Immutable.Set<Product>,
    qty: number
  ): number {
    assert(qty >= 0);

    const sorted = Array.from(products)
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
