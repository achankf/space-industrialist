import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

export enum ShipKind {

    // ships that can dock at any docking rings
    Freighter, // civilian ship for trading, unarmed
    Fighter, // cilivian or military ship, light firepower, can fire limited rounds of torpedo, kamikaze strike
    Corvette, // lightly-armed military ship, cannon fodders, very large scoting range
    Frigate, // well-armed military ship, fast, anti-piracy
    Destroyer, // large military ship, higher firepower than frigates, planet bombardment

    // ships that have docking rings, cannot dock, acts as a starbase when not moving
    Battleship, // very large military ship, carries 1 super weapon (high cooldown + pricy shot) and more packed with weapons than destroyers
    Carrier, // battleship + docking rings, overpriced, resupply base, carry small military ships, think robot animes (maybe without the mechs)
    StarBase, // low-maneuver carrier, varying offensive abilities, has industrial capacity, can build ships
    ColonyShip, // for settling new planets, 1-time use
    Shipyard, // build ship, low mobility
}

const shipKeys = Object.keys(ShipKind).filter((k) => typeof ShipKind[k as any] === "number");
const shipValues = shipKeys.map((k) => Number(ShipKind[k as any]) as ShipKind);

export const NUM_SHIP_KINDS = shipKeys.length;

export function allShipKinds() {
    return shipValues;
}

export type DockableShip =
    ShipKind.Freighter |
    ShipKind.Fighter |
    ShipKind.Corvette |
    ShipKind.Frigate |
    ShipKind.Destroyer
    ;
export type SuperLargeShip =
    ShipKind.Battleship |
    ShipKind.Carrier
    ;
export type SuperLargeBase =
    SuperLargeShip |
    ShipKind.ColonyShip |
    ShipKind.StarBase |
    ShipKind.Shipyard
    ;

export type ShipModuleKind =
    Model.Product.Laser |
    Model.Product.Gun |
    Model.Product.Missile |
    Model.Product.Hull |
    Model.Product.Armor |
    Model.Product.Shield |
    Model.Product.Engine
    ;

export type ShipOwner = Model.Government | Model.Corporation;

export enum AttackType {

    // kamikaze
    Kamikaze, // missile-like strike, very high damage if hit

    // normal shots
    Gun, // shred shield
    Missile, // long-range, area, high damage, low accuracy -- good for the resource-rich
    Laser, // good against armor

    // battleship shots
    Cannon, // super gun shot, targets the strongest enemy, battleship killer
    MAD, // super missile shot, hit lots of enemies, dealing insane damage
    MultiStrike, // super laser shot, hit all enemies with normal laser shots
}

export class Ship {

    public static blueprint(kind: Model.ShipKind): {
        modules: Map<ShipModuleKind, number>,
        maxWeapons: number,
        maxDefense: number,
    } {
        switch (kind) {
            case Model.ShipKind.Freighter:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 6],
                        [Model.Product.Hull, 10],
                    ]),
                    maxWeapons: 0,
                    maxDefense: 3,
                };
            case Model.ShipKind.Fighter:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 1],
                        [Model.Product.Hull, 1],
                    ]),
                    maxWeapons: 1,
                    maxDefense: 1,
                };
            case Model.ShipKind.Corvette:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 12],
                        [Model.Product.Hull, 14],
                    ]),
                    maxWeapons: 7,
                    maxDefense: 14,
                };
            case Model.ShipKind.Frigate:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 40],
                        [Model.Product.Hull, 60],
                    ]),
                    maxWeapons: 30,
                    maxDefense: 60,
                };
            case Model.ShipKind.Destroyer:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 120],
                        [Model.Product.Hull, 210],
                    ]),
                    maxWeapons: 105,
                    maxDefense: 210,
                };
            case Model.ShipKind.Battleship:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 200],
                        [Model.Product.Hull, 800],
                    ]),
                    maxWeapons: 400,
                    maxDefense: 800,
                };
            case Model.ShipKind.Carrier:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 600],
                        [Model.Product.Hull, 1200],
                    ]),
                    maxWeapons: 100,
                    maxDefense: 1200,
                };
            case Model.ShipKind.ColonyShip:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 200],
                        [Model.Product.Hull, 1000],
                    ]),
                    maxWeapons: 15,
                    maxDefense: 1000,
                };
            case Model.ShipKind.StarBase:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Hull, 2000],
                    ]),
                    maxWeapons: 1000,
                    maxDefense: 2000,
                };
            case Model.ShipKind.Shipyard:
                return {
                    modules: new Map<ShipModuleKind, number>([
                        [Model.Product.Engine, 200],
                        [Model.Product.Hull, 2000],
                    ]),
                    maxWeapons: 1000,
                    maxDefense: 2000,
                };
            default:
                throw new Error("not handled");
        }
    }

    constructor(
        public readonly kind: ShipKind,
        public readonly manufacturer: Model.Government,
        private owner: Model.ShipOwner,
        private template = new Map<ShipModuleKind, number>(manufacturer.latestShipDesign(kind)),
        private modules = new Map<ShipModuleKind, number>(),
    ) { }

    public getOwner() {
        return this.owner;
    }

    public takeDamage(kind: AttackType, val: number) {

        if (this.getHp() <= val) {
            this.modules.clear();
        } else {
            // TODO
        }
    }

    public getKindAbbr() {
        switch (this.kind) {
            case Model.ShipKind.Frigate:
                return "f";
            case Model.ShipKind.Freighter:
                return "F";
            case Model.ShipKind.Fighter:
                return "ƒ";
            case Model.ShipKind.Battleship:
                return "B";
            default:
                throw new Error("not handled");
        }
    }

    public getMaxHp() {
        return Algo.getQty(this.template, Model.Product.Hull);
    }

    public getHp() {
        return Algo.getQty(this.modules, Model.Product.Hull);
    }

    public getCargoSize() {
        const cargoFactor = 1000; // TODO base this on tech
        const numCargo = Algo.getQty(this.modules, Model.Product.Hull);
        return numCargo * cargoFactor;
    }

    public getSpeed() {
        const engines = Algo.getQty(this.modules, Model.Product.Engine);
        const hulls = Algo.getQty(this.template, Model.Product.Hull); // note: *MAX*Modules
        console.assert(engines >= 0);
        console.assert(hulls > 0);
        return engines / hulls;
    }

    public getCost() {
        let sum = 0;
        for (const [sModule, qty] of this.template) {
            const pricePerUnit = Model.Market.estimatePrice(
                Infinity,
                0, // 0-demand = highest price possible
                1,
                Model.Market.basePrice(sModule),
            );
            sum += pricePerUnit * qty;
        }
        return sum;
    }

    public getReplacementParts() {
        const partsNeeded = new Map<Model.ShipModuleKind, number>();
        for (const [modKind, qty] of this.template) {
            const hasQty = Algo.getQty(this.modules, modKind);
            if (qty === hasQty) {
                // no need for replacement
                continue;
            }
            partsNeeded.set(modKind, qty - hasQty);
        }
        return partsNeeded;
    }

    public putParts(mod: Model.ShipModuleKind, qty: number) {
        console.assert(qty >= 0);
        const result = Algo.getAndSum(this.modules, mod, qty);
        console.assert(result <= this.template.get(mod)!);
    }
}
