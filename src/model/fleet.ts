import { equal, subtract, sum } from "myalgo-ts";

import { assert } from "../utils/assert";
import { FleetState, ILocatable, MapDataKind } from ".";
import { Colony } from "./colony";
import { Galaxy } from "./galaxy";
import { Inventory } from "./inventory";
import { allProducts, NUM_PRODUCTS, Product } from "./product";

const PI_OVER_2 = Math.PI / 2;
const SPEED = 0.3;

export interface IFleet {
  cargoId: number;
  id: number;
  isRetiring: boolean;
  route: number[];
  routeAt: number;
  state: FleetState;
}

export class Fleet implements ILocatable {
  public readonly kind = MapDataKind.Fleet;

  constructor(
    public readonly id: number,
    private cargo: Inventory,
    private route: Colony[] = [],
    private routeAt: number = 0,
    private state = FleetState.Move,
    private isRetiring = false
  ) {}

  public serialize(): IFleet {
    return {
      cargoId: this.cargo.id,
      id: this.id,
      isRetiring: this.isRetiring,
      route: this.route.map((x) => x.id),
      routeAt: this.routeAt,
      state: this.state,
    };
  }

  public getCargo(): Inventory {
    return this.cargo;
  }

  public getRoute(): Colony[] {
    return this.route;
  }

  public getRouteAt(): number {
    return this.routeAt;
  }

  public getSpeed(galaxy: Galaxy): number {
    const from = this.getStop();
    const to = this.getNextStop();

    const fuelEff = galaxy.getRouteFuelEff(from, to);
    const fuelBonus = 1 + fuelEff;
    const fuelBonus2 = fuelBonus * fuelBonus;
    return SPEED * fuelBonus2;
  }

  public operate(galaxy: Galaxy): void {
    switch (this.state) {
      case FleetState.Hold:
        // do nothing
        break;
      case FleetState.Docked:
        this.handleDocked(galaxy);
        this.setMoveNextStop();
        break;
      case FleetState.Move:
        this.handleMove(galaxy);
        break;
    }
  }

  public setRoute(...route: Colony[]): void {
    assert(route.length > 0);
    this.route = route;
    this.state = FleetState.Hold;
  }

  public resetRoute(): void {
    this.routeAt = 0;
  }

  public start(): void {
    if (this.route.length > 0) {
      this.state = FleetState.Move;
    } else {
      assert(this.state === FleetState.Hold);
    }
  }

  public retire(): void {
    this.isRetiring = true;
  }

  public isRetire(): boolean {
    return this.isRetiring;
  }

  public getAngle(galaxy: Galaxy): number {
    if (this.route.length > 1) {
      const curPos = galaxy.getCoor(this);
      const stop = galaxy.getCoor(this.getStop());
      let from;
      let to;
      if (equal(curPos, stop)) {
        from = stop;
        const next = galaxy.getCoor(this.nextStop());
        to = next;
      } else {
        from = curPos;
        to = stop;
      }

      const [x, y] = subtract(from, to);
      const angle = Math.atan(y / x);
      return angle + (from[0] >= to[0] ? -PI_OVER_2 : PI_OVER_2);
    }
    return 0;
  }

  private partitionCargo(
    routeDemands: number[],
    lowToHigh: Product[]
  ): Map<Product, number> {
    const cargoSpace = this.cargo.getEmptySpace();
    // this method assign at least 1 unit space per commodity
    assert(cargoSpace >= allProducts().length);
    const totalDemand = sum(...routeDemands);
    const partition = new Map<Product, number>();

    if (totalDemand === 0) {
      return partition;
    }

    for (const product of lowToHigh) {
      const demand = routeDemands[product];

      // don't take goods if there's no demand for them
      if (demand === 0) {
        continue;
      }

      // underestimate "a bit"
      const qty = Math.max(1, Math.floor((demand / totalDemand) * cargoSpace));
      assert(Number.isFinite(qty));
      partition.set(product, qty);
    }

    return partition;
  }

  private getNextStop(): Colony {
    const next = this.nextStopIdx();
    const ret = this.route[next];
    assert(!!ret);
    return ret;
  }

  private handleDocked(galaxy: Galaxy): void {
    const stop = this.getStop();
    const next = this.getNextStop();

    // sum all downstream demands from the next stop
    const routeDemands = allProducts().reduce((acc, product) => {
      // get all downstream consumers (end-points of shortest paths)
      const deficitSum = sum(
        ...galaxy
          .getDownstreamConsumers(product, stop, next)
          .map((consumer) => consumer.getDeficit(galaxy, product))
      );

      acc[product] += deficitSum;
      return acc;
    }, new Array<number>(NUM_PRODUCTS).fill(0));

    const goodsUnloaded = this.cargo
      .getAllQty()
      .reduce((acc, [product, qty]) => {
        // sell goods
        const unloaded = stop.tryBuy(galaxy, this.cargo, product, qty, 0); // Market.basePrice(product));
        acc[product] += unloaded;

        return acc;
      }, new Array<number>(NUM_PRODUCTS).fill(0));

    if (this.isRetiring || !galaxy.hasTradeRoute(stop, next)) {
      // there's a better path than the fleet's path, so retire
      galaxy.removeFleet(this);
      return;
    }

    const lowToHigh = allProducts().sort(
      (a, b) => routeDemands[a] - routeDemands[b]
    );

    // buy goods - pass 1, try to spread out goods instead of filling
    {
      const demands = this.partitionCargo(routeDemands, lowToHigh);
      for (const [product, demandQty] of demands) {
        if (this.cargo.getEmptySpace() === 0) {
          break;
        }

        // cannot grab items that have been unloaded
        if (goodsUnloaded[product] > 0) {
          continue;
        }

        const inStock = this.cargo.getQty(product);

        // shouldn't buy back unloaded goods
        const purchaseQty = demandQty - inStock - goodsUnloaded[product];
        if (purchaseQty <= 0) {
          continue;
        }

        const qty = Math.min(purchaseQty, this.cargo.getEmptySpace());
        if (qty === 0) {
          continue;
        }
        assert(qty > 0);
        stop.trySell(galaxy, this.cargo, product, qty, Infinity); // Market.basePrice(product));
      }
    }

    // buy goods - pass 2, try to fill cargo space

    // pick at most 3 types of goods to fill cargo, from highest demand to lowest demand
    const fillQty = this.cargo.getEmptySpace() / 3;

    for (const product of lowToHigh.reverse()) {
      if (this.cargo.getEmptySpace() === 0) {
        break;
      }

      // cannot grab items that have been unloaded
      if (goodsUnloaded[product] > 0) {
        continue;
      }

      const inStock = this.cargo.getQty(product);
      const routeDemand = routeDemands[product];
      const purchaseQty = routeDemand - inStock - goodsUnloaded[product];
      if (purchaseQty <= 0) {
        continue;
      }
      // try to fill the remaining cargo space
      const qty = Math.min(fillQty, this.cargo.getEmptySpace());
      stop.trySell(galaxy, this.cargo, product, qty, Infinity); // Market.basePrice(product));
    }
  }

  private getStop(): Colony {
    const ret = this.route[this.routeAt];
    assert(!!ret);
    return ret;
  }

  private nextStop(): Colony {
    const ret = this.route[this.nextStopIdx()];
    assert(!!ret);
    return ret;
  }

  private nextStopIdx(): number {
    return (this.routeAt + 1) % this.route.length;
  }

  private setMoveNextStop(): void {
    // set next stop and then travel
    this.routeAt = this.nextStopIdx();
    this.state = FleetState.Move;
  }

  private handleMove(galaxy: Galaxy): void {
    const stop = this.route[this.routeAt];
    const dest = galaxy.getCoor(stop);

    const { nowAt } = galaxy.move(this, dest, this.getSpeed(galaxy));

    if (equal(nowAt, dest)) {
      this.state = FleetState.Docked;
    }
  }
}
