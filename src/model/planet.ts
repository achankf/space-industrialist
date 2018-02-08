import * as Model from "./model.js";

export class Planet implements Model.IMapData {

    public readonly isDockable = false;
    public readonly isMapObject = true;
    public readonly isCoor = false;
    public readonly kind = Model.MapDataKind.Planet;

    constructor(
        public readonly id: number,
        public readonly resource: Model.Product,
        private habitat?: Model.Habitat,
    ) { }

    public colonized(habitat: Model.Habitat) {
        this.habitat = habitat;
    }

    public getColony() {
        return this.habitat;
    }

    public isColonized() {
        return this.habitat !== undefined;
    }
}
