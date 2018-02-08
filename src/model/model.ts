
export * from "./product.js";
export * from "./bank.js";
export * from "./habitat.js";
export * from "./corporation.js";
export * from "./industry.js";
export * from "./inventory.js";
export * from "./galaxy.js";
export * from "./government.js";
export * from "./ship.js";
export * from "./fleet.js";
export * from "./market.js";
export * from "./shipyard.js";
export * from "./planet.js";

import { IRange } from "../algorithm/algorithm.js";
import { Bank } from "./bank.js";
import { Corporation } from "./corporation.js";
import { Fleet } from "./fleet.js";
import { Galaxy } from "./galaxy.js";
import { Government } from "./government.js";
import { Habitat } from "./habitat.js";
import { Inventory } from "./inventory.js";
import { Market } from "./market.js";
import { Product } from "./product.js";
import { Ship } from "./ship.js";

export interface IBankAccount {
    onBankrupt(bank: Bank): void;
    assetWorth(): number;
}

export enum IndustryModifier {
    OperationalBonus,
}

export interface IOpDemand {
    neededKinds: Set<Product>;
    qty: number;
    modifierKind: IndustryModifier;
}

export interface IProducer {
    readonly productType: Product;
    prodCap(galaxy: Galaxy): number;
    getOpDemand(galaxy: Galaxy): IOpDemand[];
}

export type HasInventory = Corporation | Habitat;

export interface IHasMarket {
    getProdCap(galaxy: Galaxy, product: Product): number;
    getDemand(galaxy: Galaxy, product: Product): number;
    getAggDemand(galaxy: Galaxy, product: Product): number;
    getMarket(galaxy: Galaxy): Market;
}

export enum FleetState {
    Hold,
    Move,
    Docked,
    Combat,
    Guard,
    Escape,
}
