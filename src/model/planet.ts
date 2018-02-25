import * as Model from "./model";

export class Planet implements Model.ILocatable {

    public readonly kind = Model.MapDataKind.Planet;

    constructor(
        public readonly id: number,
        public readonly resource: Model.RawMaterial,
        private colony?: Model.Colony,
    ) { }

    public serialize(): Model.IPlanet {
        return {
            id: this.id,
            resource: this.resource,
        };
    }

    public colonized(colony: Model.Colony) {
        this.colony = colony;
    }

    public getColony() {
        return this.colony;
    }

    public isColonized() {
        return this.colony !== undefined;
    }
}
