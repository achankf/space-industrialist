export enum FleetState {
  Hold,
  Move,
  Docked,
}

export enum MapDataKind {
  Planet,
  Fleet,
  RouteSegment,
}

export interface IMapData {
  readonly kind: MapDataKind;
}

export interface IEntity {
  readonly id: number;
}

export interface ILocatable extends IEntity {
  readonly kind: MapDataKind.Planet | MapDataKind.Fleet;
}

export interface IRouteSegment {
  readonly kind: MapDataKind.RouteSegment;
  readonly from: CoorT;
  readonly to: CoorT;
}

export type CoorT = [number, number];

export const YEAR_PER_TICK = 120;
export const ANNUAL_INTEREST = 0.1; // 10% interest, compounded daily
export const TRADER_COST = 10000;
export const INDUSTRY_COST = 10000;
export const INDUSTRY_DEMOLISH_COST = INDUSTRY_COST / 10;
export const POWER_PLANT_COST = 1000000;

const MAP_DATA_KEYS = Object.keys(MapDataKind).filter(
  (k) => typeof MapDataKind[k as keyof typeof MapDataKind] === "number"
);
const MAP_DATA_VALUES = MAP_DATA_KEYS.map(
  (k) => Number(MapDataKind[k as keyof typeof MapDataKind]) as MapDataKind
);

export function allMapDataKind(): MapDataKind[] {
  return MAP_DATA_VALUES;
}
