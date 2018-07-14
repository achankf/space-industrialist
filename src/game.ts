import Dexie from "dexie";
import { CoorT, ILocatable, MapDataKind } from "./model";
import { Colony } from "./model/colony";
import { Fleet } from "./model/fleet";
import { Galaxy, IGalaxySaveData } from "./model/galaxy";
import { Industry } from "./model/industry";
import { Planet } from "./model/planet";
import { Product } from "./model/product";

export interface ISaveData {
    galaxySave: IGalaxySaveData;
}

class DB extends Dexie {

    private readonly saveTable?: Dexie.Table<ISaveData, number>;

    constructor() {
        super("gameDB");
        this.version(1).stores({ saveTable: ",galaxySave,mapViewSave" });
    }

    public save(saveData: ISaveData) {
        return this.saveTable!.put(saveData, 0);
    }

    public getSave() {
        return this.saveTable!.get(0);
    }
}

export class Game {

    public static async tryLoad() {
        const saveData = await new DB().getSave();
        return new Game().reload(saveData);
    }

    private galaxyReadProxy!: GalaxyReadProxy;
    private galaxyWriteProxy!: GalaxyWriteProxy;

    private galaxy!: Galaxy;
    private db = new DB();
    private isJustReloadedLocal = true;

    private isDirty2 = false;

    public getReader() {
        return this.galaxyReadProxy;
    }

    public getWriter() {
        this.isDirty2 = true;
        return this.galaxyWriteProxy;
    }

    public isDirty = () => {
        return this.isDirty2;
    }

    public resetDirty = () => {
        this.isDirty2 = false;
    }

    public isJustReloaded() {
        const temp = this.isJustReloadedLocal;
        this.isJustReloadedLocal = false;
        return temp;
    }

    public reload(saveData?: ISaveData) {

        this.isJustReloadedLocal = true;

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

    public async save() {
        const saveData = this.serialize();
        return this.db.save(saveData);
    }
}

/**
 * All views should use this class to interact with the Galaxy object.
 */
export class GalaxyReadProxy {
    constructor(private galaxy: Galaxy) { }

    public exists = (obj: ILocatable) => {
        return this.galaxy.exists(obj);
    }

    public getFleetSpeed = (fleet: Fleet) => {
        return fleet.getSpeed(this.galaxy);
    }

    public getCoor = (obj: ILocatable | Colony) => {
        return this.galaxy.getCoor(obj);
    }

    public searchNearbyObjs = (at: CoorT, radius: number = 0, minDistance = 0) => {
        return this.galaxy.searchNearbyObjs(at, radius, minDistance);
    }

    public getTradeRoutes = () => {
        return this.galaxy.getTradeRoutes();
    }

    public getObjs = () => {
        return this.galaxy.getObjs();
    }

    public getAngle = (fleet: Fleet) => {
        return fleet.getAngle(this.galaxy);
    }

    public getIndustries = (colony: Colony) => {
        return this.galaxy.getIndustries(colony);
    }

    public prodCap = (industry: Industry) => {
        return industry.prodCap(this.galaxy);
    }

    public usedEnergy = (industry: Industry) => {
        return industry.usedEnergy(this.galaxy);
    }

    public getNumColonists = () => {
        return this.galaxy.getNumColonists();
    }

    public growthRate = (colony: Colony) => {
        return colony.growthRate(this.galaxy);
    }

    public getTotalPowerUsage = (colony: Colony) => {
        return colony.getTotalPowerUsage(this.galaxy);
    }

    public getMoney = () => {
        return this.galaxy.getMoney();
    }

    public canExpandPowerPlant = (colony: Colony) => {
        return colony.canExpandPowerPlant(this.galaxy);
    }

    public getPowerUsageEff = (colony: Colony) => {
        return colony.getPowerUsageEff(this.galaxy);
    }

    public getEnergyPrice = (colony: Colony) => {
        return colony.getEnergyPrice(this.galaxy);
    }

    public getGalacticDemands = (productType: Product) => {
        return this.galaxy.getGalacticDemands(productType);
    }

    public getGalacticProdCap = (productType: Product) => {
        return this.galaxy.getGalacticProdCap(productType);
    }

    public getGalacticSupplies = (productType: Product) => {
        return this.galaxy.getGalacticSupplies(productType);
    }

    public getPlanet = (at: CoorT) => {
        return this.galaxy.getObj(at, MapDataKind.Planet);
    }

    public getNumUsedTraders = (from: Colony, to: Colony) => {
        return this.galaxy.getNumUsedTraders(from, to);
    }

    public getRouteFuelEff = (from: Colony, to: Colony) => {
        return this.galaxy.getRouteFuelEff(from, to);
    }

    public getNumUnusedTraders = () => {
        return this.galaxy.getNumUnusedTraders();
    }

    public getYear = () => {
        return this.galaxy.getYear();
    }

    public getDay = () => {
        return this.galaxy.getDay();
    }

    public getScore = () => {
        return this.galaxy.getScore();
    }

    public isRetired = (fleet: Fleet) => {
        return fleet.isRetire();
    }

    public getNumColonizedPlanets = () => {
        return this.galaxy.getNumColonizedPlanets();
    }
}

export class GalaxyWriteProxy {

    constructor(private galaxy: Galaxy) { }

    public colonizePlanet = (planet: Planet, population: number) => {
        return this.galaxy.colonizePlanet(planet, population);
    }

    public expandPowerPlant = (colony: Colony) => {
        colony.expandPowerPlanet(this.galaxy);
    }

    public withdraw = (amount: number) => {
        this.galaxy.withdraw(amount);
    }

    public shutdownIndustry = (colony: Colony, industry: Industry) => {
        this.galaxy.shutdownIndustry(colony, industry);
    }

    public addIndustry = (productType: Product, colony: Colony) => {
        return this.galaxy.addIndustry(productType, colony);
    }

    public addTradeFleet = (from: Colony, to: Colony) => {
        return this.galaxy.addTradeFleet(from, to);
    }

    public addTrader = () => {
        return this.galaxy.addTrader();
    }

    public turn = () => {
        return this.galaxy.turn();
    }

    public retire = (fleet: Fleet) => {
        fleet.retire();
    }
}
