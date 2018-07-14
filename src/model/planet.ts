import { ILocatable, MapDataKind } from ".";
import { Colony } from "./colony";
import { RawMaterial } from "./product";

export interface IPlanet {
    id: number;
    resource: RawMaterial;
}

export class Planet implements ILocatable {

    public readonly kind = MapDataKind.Planet;

    constructor(
        public readonly id: number,
        public readonly resource: RawMaterial,
        private colony?: Colony,
    ) { }

    public serialize(): IPlanet {
        return {
            id: this.id,
            resource: this.resource,
        };
    }

    public colonized(colony: Colony) {
        this.colony = colony;
    }

    public getColony() {
        return this.colony;
    }

    public isColonized() {
        return this.colony !== undefined;
    }
}
