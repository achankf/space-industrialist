import * as Immutable from "immutable";
import * as Algo from "../algorithm/algorithm";
import * as Model from "./model";

const PI_OVER_2 = Math.PI / 2;
const SPEED = 0.3;

export class Fleet implements Model.ILocatable {

    public readonly kind = Model.MapDataKind.Fleet;

    constructor(
        public readonly id: number,
        private cargo: Model.Inventory,
        private route: Model.Colony[] = [],
        private routeAt: number = 0,
        private state = Model.FleetState.Move,
        private isRetiring = false,
    ) { }

    public serialize(): Model.IFleet {
        return {
            cargoId: this.cargo.id,
            id: this.id,
            isRetiring: this.isRetiring,
            route: this.route.map((x) => x.id),
            routeAt: this.routeAt,
            state: this.state,
        };
    }

    public getCargo() {
        return this.cargo;
    }

    public getRoute() {
        return this.route;
    }

    public getRouteAt() {
        return this.routeAt;
    }

    public getSpeed(galaxy: Model.Galaxy) {
        const from = this.getStop();
        console.assert(from !== undefined);
        const to = this.getNextStop()!;
        console.assert(to !== undefined);

        const fuelEff = galaxy.getRouteFuelEff(from, to);
        const fuelBonus = 1 + fuelEff;
        const fuelBonus2 = fuelBonus * fuelBonus;
        return SPEED * fuelBonus2;
    }

    public operate(galaxy: Model.Galaxy) {
        switch (this.state) {
            case Model.FleetState.Hold:
                // do nothing
                break;
            case Model.FleetState.Docked:
                this.handleDocked(galaxy);
                this.setMoveNextStop();
                break;
            case Model.FleetState.Move:
                this.handleMove(galaxy);
                break;
        }
    }

    public setRoute(...route: Model.Colony[]) {
        console.assert(route.length > 0);
        this.route = route;
        this.state = Model.FleetState.Hold;
    }

    public resetRoute() {
        this.routeAt = 0;
    }

    public start() {
        if (this.route.length > 0) {
            this.state = Model.FleetState.Move;
        } else {
            console.assert(this.state === Model.FleetState.Hold);
        }
    }

    public retire() {
        this.isRetiring = true;
    }

    public isRetire() {
        return this.isRetiring;
    }

    public getAngle(galaxy: Model.Galaxy) {
        if (this.route.length > 1) {
            const curPos = galaxy.getCoor(this);
            const stop = galaxy.getCoor(this.getStop());
            let from;
            let to;
            if (Algo.equal2D(curPos, stop)) {
                from = stop;
                const next = galaxy.getCoor(this.nextStop());
                to = next;
            } else {
                from = curPos;
                to = stop;
            }

            const [x, y] = Algo.subtract2D(from, to);
            const angle = Math.atan(y / x);
            return angle + (from[0] >= to[0] ? -PI_OVER_2 : PI_OVER_2);
        }
        return 0;
    }

    private partitionCargo(routeDemands: number[], lowToHigh: Model.Product[]) {

        const cargoSpace = this.cargo.getEmptySpace();
        // this method assign at least 1 unit space per commodity
        console.assert(cargoSpace >= Model.allProducts().length);
        const totalDemand = Algo.sum(...routeDemands);
        const partition = new Map<Model.Product, number>();

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
            const qty = Math.max(1, Math.floor(demand / totalDemand * cargoSpace));
            console.assert(Number.isFinite(qty));
            partition.set(product, qty);
        }

        return partition;
    }

    private getNextStop() {
        const next = this.nextStopIdx();
        return this.route[next];
    }

    private handleDocked(galaxy: Model.Galaxy) {

        const stop = this.getStop();
        const next = this.getNextStop();

        // sum all downstream demands from the next stop
        const routeDemands = Model
            .allProducts()
            .reduce((acc, product) => {
                // get all downstream consumers (end-points of shortest paths)
                const deficitSum = Algo.sum(...galaxy
                    .getDownstreamConsumers(product, stop, next)
                    .map((consumer) => consumer.getDeficit(galaxy, product)));

                acc[product] += deficitSum;
                return acc;
            }, new Array<number>(Model.NUM_PRODUCTS).fill(0));

        const goodsUnloaded = new Array<number>(Model.NUM_PRODUCTS).fill(0);

        // sell goods
        for (const [product, qty] of this.cargo.getAllQty()) {

            if (qty === 0) {
                continue;
            }

            const unloaded = stop
                .tryBuy(
                    galaxy,
                    this.cargo,
                    product,
                    qty,
                    0); // Model.Market.basePrice(product));
            goodsUnloaded[product] += unloaded;
        }

        if (this.isRetiring || !galaxy.hasTradeRoute(stop, next)) {
            // there's a better path than the fleet's path, so retire
            galaxy.removeFleet(this);
            return;
        }

        const lowToHigh = Model
            .allProducts()
            .sort((a, b) => routeDemands[a] - routeDemands[b]);

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
                console.assert(qty > 0);
                stop
                    .trySell(
                        galaxy,
                        this.cargo,
                        product,
                        qty,
                        Infinity); // Model.Market.basePrice(product));
            }
        }

        // buy goods - pass 2, try to fill cargo space

        // pick at most 3 types of goods to fill cargo, from highest demand to lowest demand
        const fillQty = this.cargo.getEmptySpace() / 3;

        for (const product of Immutable.Seq(lowToHigh).reverse()) {

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
            stop
                .trySell(
                    galaxy,
                    this.cargo,
                    product,
                    qty,
                    Infinity); // Model.Market.basePrice(product));
        }
    }

    private getStop() {
        return this.route[this.routeAt];
    }

    private nextStop() {
        return this.route[this.nextStopIdx()];
    }

    private nextStopIdx() {
        return (this.routeAt + 1) % this.route.length;
    }

    private setMoveNextStop() {
        // set next stop and then travel
        this.routeAt = this.nextStopIdx();
        this.state = Model.FleetState.Move;
    }

    private handleMove(galaxy: Model.Galaxy) {

        const stop = this.route[this.routeAt];
        const dest = galaxy.getCoor(stop);

        const { nowAt } = galaxy.move(this, dest, this.getSpeed(galaxy));

        if (Algo.equal2D(nowAt, dest)) {
            this.state = Model.FleetState.Docked;
        }
    }
}
