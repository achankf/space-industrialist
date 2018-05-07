import * as Model from ".";

export interface IPlanet {
    id: number;
    resource: Model.RawMaterial;
}

export class Planet implements Model.ILocatable {

    public readonly kind = Model.MapDataKind.Planet;

    constructor(
        public readonly id: number,
        public readonly resource: Model.RawMaterial,
        private colony?: Model.Colony,
    ) { }

    public serialize(): IPlanet {
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
