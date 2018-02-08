import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

const PI_OVER_2 = Math.PI / 2;

export class Fleet implements Model.IMapData {

    public readonly isDockable = false;
    public readonly isMapObject = true;
    public readonly isCoor = false;
    public readonly kind = Model.MapDataKind.Fleet;

    private route: Model.RouteStop[] = [];
    private routeAt: number = 0;
    private speed = this.calSpeed();

    private state = Model.FleetState.Hold;
    private cargo = new Model.Inventory(this.calCargoSpace());

    constructor(
        public readonly id: number,
        private owner: Model.Corporation | Model.Government,
    ) { }

    public getCargo() {
        return this.cargo;
    }

    public getRoute() {
        return this.route;
    }

    public getRouteAt() {
        return this.routeAt;
    }

    public engage(fleet: Fleet) {
        console.assert(fleet !== this);
        // TODO
    }

    public getSpeed() {
        return this.speed;
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
            case Model.FleetState.Guard:
            case Model.FleetState.Escape:
            case Model.FleetState.Combat:
            default:
                throw new Error("not handled");
        }
    }

    public setRoute(...route: Model.RouteStop[]) {
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
            return angle + from[0] >= to[0] ? -PI_OVER_2 : PI_OVER_2;
        }
        return 0;
    }

    private partitionCargo(routeDemands: Map<Model.Product, number>) {

        const cargoSpace = this.cargo.getEmptySpace();
        // this method assign at least 1 unit space per commodity
        console.assert(cargoSpace >= Model.allProducts().length);

        const smallToLarge = Array
            .from(routeDemands.entries())
            .sort(([, a], [, b]) => a - b);
        const totalDemand = Algo.sum(...Array.from(routeDemands.values()));
        const partition = new Map<Model.Product, number>();

        if (totalDemand === 0) {
            return partition;
        }

        let runningSum = 0;
        for (const [product, demand] of smallToLarge) {

            // underestimate "a bit"
            const qty = Math.max(1, Math.floor(demand / totalDemand * cargoSpace));
            console.assert(Number.isFinite(qty));
            runningSum += qty;
            partition.set(product, qty);
        }

        return partition;
    }

    private tryGetMarket(galaxy: Model.Galaxy, stop: Model.RouteStop) {
        if (stop.isMapObject && stop.kind === Model.MapDataKind.Planet) {
            const habitat = (stop as Model.Planet).getColony();
            if (habitat) {
                return galaxy.getMarket(habitat.getHome());
            }
        }
    }

    private getNextMarket(galaxy: Model.Galaxy) {
        const at = this.routeAt;
        let cur = at;
        while (true) {
            cur = (cur + 1) % this.route.length;
            if (cur === at) {
                break;
            }
            const stop = this.route[cur];
            const market = this.tryGetMarket(galaxy, stop);
            if (market) {
                return market;
            }
        }
    }

    private handleDocked(galaxy: Model.Galaxy) {

        const stop = this.getStop();

        const stopMarket = this.tryGetMarket(galaxy, stop);
        if (!stopMarket) {
            console.assert(false); // not sure how this may happen, for now
            return;
        }

        const nextMarket = this.getNextMarket(galaxy);
        if (!nextMarket) {
            // there's no next market, no demand
            return;
        }

        const routeDemands = new Map<Model.Product, number>();

        // sum all downstream demands from the next stop
        for (const product of Model.allProducts()) {
            if (stop.kind === Model.MapDataKind.Planet) {

                // get all downstream consumers (end-points of shortest paths)
                const consumers = galaxy.getDownstreamConsumers(product, stopMarket, nextMarket);

                for (const consumer of consumers) {
                    Algo.getAndSum(routeDemands, product, consumer.getDeficit(galaxy, product));
                }
            }
        }

        const goodsUnloaded = new Map<Model.Product, number>();

        // sell goods
        for (const [product, qty] of this.cargo.getAllQty()) {
            const unloaded = stopMarket
                .tryBuy(
                galaxy,
                this.cargo,
                this.owner,
                product,
                qty,
                0); // Model.Market.basePrice(product));
            goodsUnloaded.set(product, unloaded);
        }

        // buy goods - pass 1, try to spread out goods instead of filling
        {
            const demands = this.partitionCargo(routeDemands);
            for (const [product, demandQty] of demands) {

                // cannot grad items that have been unloaded
                if (goodsUnloaded.has(product)) {
                    continue;
                }

                const inStock = this.cargo.getQty(product);

                // shouldn't buy back unloaded goods
                const purchaseQty = demandQty - inStock - Algo.getQty(goodsUnloaded, product);
                if (purchaseQty <= 0) {
                    continue;
                }

                const qty = Math.min(purchaseQty, this.cargo.getEmptySpace());
                if (qty === 0) {
                    continue;
                }
                console.assert(qty > 0);
                stopMarket
                    .trySell(
                    galaxy,
                    this.cargo,
                    this.owner,
                    product,
                    qty,
                    Infinity); // Model.Market.basePrice(product));
            }
        }

        // buy goods - pass 2, try to fill cargo space
        for (const product of Model.allProducts()) {

            // cannot grad items that have been unloaded
            if (goodsUnloaded.has(product)) {
                continue;
            }

            const inStock = this.cargo.getQty(product);
            const routeDemand = Algo.getQty(routeDemands, product);
            const purchaseQty = routeDemand - inStock - Algo.getQty(goodsUnloaded, product);
            if (purchaseQty <= 0) {
                continue;
            }
            const qty = Math.min(purchaseQty, this.cargo.getEmptySpace());
            stopMarket
                .trySell(
                galaxy,
                this.cargo,
                this.owner,
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

        const ret = galaxy.move(this, dest, this.getSpeed());

        if (Algo.equal2D(ret.nowAt, dest)) {
            if (stop.isDockable) {
                this.state = Model.FleetState.Docked;
            } else {
                this.setMoveNextStop();
            }
        }
    }

    private calSpeed() {
        /*
        const speeds = Array.from(this.ships
            .values())
            .map((ship) => ship.getSpeed());
        return Math.min(...speeds);
        */
        return 0.3;
    }

    private calCargoSpace() {
        /*
        return Algo.sum(...Array.from(this.ships)
            .map((ship) => ship.getCargoSize()));
            */
        return 1000;
    }
}
