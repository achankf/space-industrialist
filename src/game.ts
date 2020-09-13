import Dexie from "dexie";
import * as Immutable from "immutable";
import { CoorT, ILocatable, IRouteSegment, MapDataKind } from "./model";
import { Colony } from "./model/colony";
import { Fleet } from "./model/fleet";
import { Galaxy, IGalaxySaveData } from "./model/galaxy";
import { Industry } from "./model/industry";
import { Planet } from "./model/planet";
import { Product } from "./model/product";
import Bug from "./utils/UnreachableError";
export interface ISaveData {
  galaxySave: IGalaxySaveData;
}

class DB extends Dexie {
  private readonly saveTable?: Dexie.Table<ISaveData, number>;

  constructor() {
    super("gameDB");
    this.version(1).stores({ saveTable: ",galaxySave,mapViewSave" });
  }

  public async save(saveData: ISaveData): Promise<number> {
    const ret = await this.saveTable?.put(saveData, 0);
    if (ret === undefined) {
      throw new Error("cannot save game");
    }
    return ret;
  }

  public async getSave(): Promise<ISaveData | undefined> {
    return this.saveTable?.get(0);
  }
}

export class Game {
  public static async tryLoad(): Promise<{ game: Game; isNewGame: boolean }> {
    const saveData = await new DB().getSave();
    return new Game().reload(saveData);
  }

  private galaxy = new Galaxy();
  private galaxyReadProxy: GalaxyReadProxy;
  private galaxyWriteProxy: GalaxyWriteProxy;

  private db = new DB();

  constructor() {
    this.galaxy = new Galaxy();
    this.galaxyReadProxy = new GalaxyReadProxy(this.galaxy);
    this.galaxyWriteProxy = new GalaxyWriteProxy(this.galaxy);
  }

  public set onChange(handler: () => void) {
    this.galaxyWriteProxy.onChange = handler;
  }

  public getReader(): GalaxyReadProxy {
    return this.galaxyReadProxy;
  }

  public getWriter(): GalaxyWriteProxy {
    return this.galaxyWriteProxy;
  }

  public reload(saveData?: ISaveData): { game: Game; isNewGame: boolean } {
    let isNewGame = true;

    if (saveData) {
      try {
        this.galaxy = Galaxy.createFrom(saveData.galaxySave);
        isNewGame = false;
      } catch (e) {
        this.galaxy = new Galaxy();
        this.galaxy.addPlanets(20, 1);
      }
    } else {
      this.galaxy = new Galaxy();
      this.galaxy.addPlanets(20, 1);
    }

    this.galaxyReadProxy = new GalaxyReadProxy(this.galaxy);
    this.galaxyWriteProxy = new GalaxyWriteProxy(this.galaxy);

    return { game: this, isNewGame };
  }

  public serialize(): ISaveData {
    const galaxySave = this.galaxy.serialize();

    return {
      galaxySave,
    };
  }

  public async save(): Promise<number> {
    const saveData = this.serialize();
    return this.db.save(saveData);
  }
}

/**
 * All views should use this class to interact with the Galaxy object.
 */
export class GalaxyReadProxy {
  constructor(private galaxy: Galaxy) {}

  public exists(obj: ILocatable): boolean {
    return this.galaxy.exists(obj);
  }

  public getFleetSpeed(fleet: Fleet): number {
    return fleet.getSpeed(this.galaxy);
  }

  public getCoor(obj: ILocatable | Colony): CoorT {
    return this.galaxy.getCoor(obj);
  }

  public searchNearbyObjs(
    at: CoorT,
    radius = 0,
    minDistance = 0
  ): Immutable.Set<ILocatable | IRouteSegment> {
    return this.galaxy.searchNearbyObjs(at, radius, minDistance);
  }

  public getTradeRoutes(): Map<Colony, Colony[]> {
    return this.galaxy.getTradeRoutes();
  }

  public getObjs(): Map<ILocatable, CoorT> {
    return this.galaxy.getObjs();
  }

  public getAngle(fleet: Fleet): number {
    return fleet.getAngle(this.galaxy);
  }

  public getIndustries(colony: Colony): Set<Industry> | undefined {
    return this.galaxy.tryGetIndustries(colony);
  }

  public prodCap(industry: Industry): number {
    return industry.prodCap(this.galaxy);
  }

  public usedEnergy(industry: Industry): number {
    return industry.usedEnergy(this.galaxy);
  }

  public getNumColonists(): number {
    return this.galaxy.getNumColonists();
  }

  public growthRate(colony: Colony): number {
    return colony.growthRate(this.galaxy);
  }

  public getTotalPowerUsage(
    colony: Colony
  ): {
    industrialUsage: number;
    traderUsage: number;
    civUsage: number;
    totalUsage: number;
  } {
    return colony.getTotalPowerUsage(this.galaxy);
  }

  public getMoney(): number {
    return this.galaxy.getMoney();
  }

  public canExpandPowerPlant(colony: Colony): boolean {
    return colony.canExpandPowerPlant(this.galaxy);
  }

  public getPowerUsageEff(colony: Colony): number {
    return colony.getPowerUsageEff(this.galaxy);
  }

  public getEnergyPrice(colony: Colony): number {
    return colony.getEnergyPrice(this.galaxy);
  }

  public getGalacticDemands(productType: Product): number {
    return this.galaxy.getGalacticDemands(productType);
  }

  public getGalacticProdCap(productType: Product): number {
    return this.galaxy.getGalacticProdCap(productType);
  }

  public getGalacticSupplies(productType: Product): number {
    return this.galaxy.getGalacticSupplies(productType);
  }

  public tryGetPlanet(at: CoorT): Planet | undefined {
    return this.galaxy.getObj(at, MapDataKind.Planet) as Planet | undefined;
  }

  public getPlanet(at: CoorT): Planet {
    const ret = this.tryGetPlanet(at);
    if (!ret) {
      throw new Bug("cannot find planet");
    }
    return ret;
  }

  public getNumUsedTraders(from: Colony, to: Colony): number {
    return this.galaxy.getNumUsedTraders(from, to);
  }

  public getRouteFuelEff(from: Colony, to: Colony): number {
    return this.galaxy.getRouteFuelEff(from, to);
  }

  public getNumUnusedTraders(): number {
    return this.galaxy.getNumUnusedTraders();
  }

  public getYear(): number {
    return this.galaxy.getYear();
  }

  public getDay(): number {
    return this.galaxy.getDay();
  }

  public getScore(): number {
    return this.galaxy.getScore();
  }

  public isRetired(fleet: Fleet): boolean {
    return fleet.isRetire();
  }

  public getNumColonizedPlanets(): number {
    return this.galaxy.getNumColonizedPlanets();
  }

  public calCenter(): [number, number] {
    return this.galaxy.calCenter();
  }
}

export class GalaxyWriteProxy {
  private onChangeHandler?: () => void;

  private triggerOnChange() {
    if (this.onChangeHandler) {
      this.onChangeHandler();
    }
  }

  constructor(private galaxy: Galaxy) {}

  public set onChange(handler: () => void) {
    if (this.onChangeHandler) {
      throw new Bug("onChangeHandler should only be set once");
    }
    this.onChangeHandler = handler;
  }

  public colonizePlanet(planet: Planet, population: number): Colony {
    const ret = this.galaxy.colonizePlanet(planet, population);
    this.triggerOnChange();
    return ret;
  }

  public expandPowerPlant(colony: Colony): void {
    colony.expandPowerPlanet(this.galaxy);
    this.triggerOnChange();
  }

  public withdraw(amount: number): void {
    this.galaxy.withdraw(amount);
    this.triggerOnChange();
  }

  public shutdownIndustry(colony: Colony, industry: Industry): void {
    this.galaxy.shutdownIndustry(colony, industry);
    this.triggerOnChange();
  }

  public addIndustry(productType: Product, colony: Colony): Industry {
    const ret = this.galaxy.addIndustry(productType, colony);
    this.triggerOnChange();
    return ret;
  }

  public addTradeFleet(from: Colony, to: Colony): Fleet {
    const ret = this.galaxy.addTradeFleet(from, to);
    this.triggerOnChange();
    return ret;
  }

  public addTrader(): void {
    const ret = this.galaxy.addTrader();
    this.triggerOnChange();
    return ret;
  }

  public turn(): boolean {
    const ret = this.galaxy.turn();
    this.triggerOnChange();
    return ret;
  }

  public retire(fleet: Fleet): void {
    fleet.retire();
    this.triggerOnChange();
  }
}
