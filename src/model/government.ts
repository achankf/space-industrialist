import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

export type ShipBluePrint = Map<Model.ShipModuleKind, number>;

export class Government implements Model.IBankAccount {

    private shipTemplate = new Map<Model.ShipKind, ShipBluePrint[]>();
    private habitats = new Set<Model.Habitat>();

    constructor() {
        for (const kind of Model.allShipKinds()) {
            this.createBlueprint(kind);
        }
    }

    public totalPopulation() {
        return Algo.sum(...Array.from(this.habitats.values())
            .map((habitat) => habitat.getPopulation()));
    }

    public operate() {
        // TODO
    }

    public addHabitat(habitat: Model.Habitat) {
        console.assert(!this.habitats.has(habitat));
        this.habitats.add(habitat);
    }

    public onBankrupt(whichBank: Model.Bank) {
        console.log("government bankrupt");
        // TODO
    }

    public assetWorth() {
        return Infinity;
    }

    public latestShipDesign(kind: Model.ShipKind) {
        const blueprints = this.shipTemplate.get(kind)!;
        console.assert(blueprints.length > 0);
        return blueprints[blueprints.length - 1];
    }

    public createBlueprint(kind: Model.ShipKind) {
        const blueprint = Model.Ship.blueprint(kind);

        // TODO
        blueprint.modules.set(Model.Product.Shield, blueprint.maxDefense);
        blueprint.modules.set(Model.Product.Laser, blueprint.maxWeapons);

        const blueprints = Algo.getOrSet(this.shipTemplate, kind, () => []);
        blueprints.push(blueprint.modules);
    }
}
