import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

type BuildShipOrder = [Model.ShipOwner, Model.ShipBluePrint];

const MIN_BUILD_EFF = 0.1;
const BASE_BUILD_YIELD = 10;

export class Shipyard implements Model.IMapData, Model.IHasMarket {

    public readonly isDockable = true;
    public readonly isMapObject = true;
    public readonly isCoor = false;
    public readonly kind = Model.MapDataKind.Shipyard;

    private inventory = new Model.Inventory();
    private orders: BuildShipOrder[] = [];
    private progress = new Map<BuildShipOrder, Model.Ship>();

    private buildEff = MIN_BUILD_EFF;
    private numBuildYard = 1;

    constructor(
        public readonly id: number,
        private link: Model.ColonizableT,
    ) { }

    public getLink() {
        return this.link;
    }

    public getMarket(galaxy: Model.Galaxy) {
        return galaxy.getMarket(this.link);
    }

    public getInventory() {
        return this.inventory;
    }

    public orderShip(customer: Model.ShipOwner, kind: Model.ShipKind) {
        /*
        const blueprint = this.owner.latestShipDesign(kind);
        const idx = this.orders.length;
        this.orders.push([customer, blueprint]);
        const order = this.orders[idx];
        const ship = new Model.Ship(kind, this.owner, customer, blueprint);
        this.progress.set(order, ship);
        */
    }

    public getBuildYield() {
        return this.buildEff * BASE_BUILD_YIELD;
    }

    public operate(galaxy: Model.Galaxy) {
        const buildYield = this.getBuildYield();
        for (let i = 0; i < this.numBuildYard && i < this.orders.length; i++) {
            const order = this.orders[i];
            const ship = this.progress.get(order)!;
            const needed = ship.getReplacementParts();
            console.assert(ship !== undefined);
            let partsToBuild = buildYield;
            for (const [mod, qty] of needed) {
                const inStock = Math.min(partsToBuild, this.inventory.getQty(mod));
                const buildQty = qty >= inStock ? inStock : qty;
                this.inventory.takeGoods(mod, buildQty);
                ship.putParts(mod, buildQty);
                partsToBuild -= buildQty;

                if (partsToBuild === 0) {
                    break;
                }
            }
        }
    }

    public getDemand(galaxy: Model.Galaxy, product: Model.Product) {
        switch (product) {
            case Model.Product.Metal:
            case Model.Product.Gem:
            case Model.Product.Chemical:
            case Model.Product.Fiber:
            // return 10000000;
            default:
                return 0;
        }
    }

    public getAggDemand(galaxy: Model.Galaxy, product: Model.Product) {
        return this.getDemand(galaxy, product);
    }

    public getProdCap(galaxy: Model.Galaxy, product: Model.Product) {
        return 0;
    }
}
