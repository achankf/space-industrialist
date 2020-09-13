import Bug from "../utils/UnreachableError";
import { Colony } from "./colony";
import { RawMaterial } from "./product";
import { ILocatable, MapDataKind } from ".";

export interface IPlanet {
  id: number;
  resource: RawMaterial;
}

export class Planet implements ILocatable {
  public readonly kind = MapDataKind.Planet;

  constructor(
    public readonly id: number,
    public readonly resource: RawMaterial,
    private colony?: Colony
  ) {}

  public serialize(): IPlanet {
    return {
      id: this.id,
      resource: this.resource,
    };
  }

  public colonized(colony: Colony): void {
    this.colony = colony;
  }

  public tryGetColony(): Colony | undefined {
    return this.colony;
  }

  public getColony(): Colony {
    if (!this.colony) {
      throw new Bug("this method should be called for colonized planets");
    }
    return this.colony;
  }

  public isColonized(): boolean {
    return this.colony !== undefined;
  }
}
