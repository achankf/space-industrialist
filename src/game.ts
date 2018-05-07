import Dexie from "dexie";
import * as Model from "./model";

export interface ISaveData {
    galaxySave: Model.IGalaxySaveData;
    // mapViewSave: View.IMapViewSaveData;
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

    private galaxy!: Model.Galaxy;
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
                this.galaxy = Model.Galaxy.createFrom(saveData.galaxySave);
                isNewGame = false;
            } catch (e) {
                this.galaxy = new Model.Galaxy();
                this.galaxy.addPlanets(20, 1);
            }
        } else {
            this.galaxy = new Model.Galaxy();
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
    constructor(private galaxy: Model.Galaxy) { }

    public exists = (obj: Model.ILocatable) => {
        return this.galaxy.exists(obj);
    }

    public getFleetSpeed = (fleet: Model.Fleet) => {
        return fleet.getSpeed(this.galaxy);
    }

    public getCoor = (obj: Model.ILocatable | Model.Colony) => {
        return this.galaxy.getCoor(obj);
    }

    public searchNearbyObjs = (at: Model.CoorT, radius: number = 0, minDistance = 0) => {
        return this.galaxy.searchNearbyObjs(at, radius, minDistance);
    }

    public getTradeRoutes = () => {
        return this.galaxy.getTradeRoutes();
    }

    public getObjs = () => {
        return this.galaxy.getObjs();
    }

    public getAngle = (fleet: Model.Fleet) => {
        return fleet.getAngle(this.galaxy);
    }

    public getIndustries = (colony: Model.Colony) => {
        return this.galaxy.getIndustries(colony);
    }

    public prodCap = (industry: Model.Industry) => {
        return industry.prodCap(this.galaxy);
    }

    public usedEnergy = (industry: Model.Industry) => {
        return industry.usedEnergy(this.galaxy);
    }

    public getNumColonists = () => {
        return this.galaxy.getNumColonists();
    }

    public growthRate = (colony: Model.Colony) => {
        return colony.growthRate(this.galaxy);
    }

    public getTotalPowerUsage = (colony: Model.Colony) => {
        return colony.getTotalPowerUsage(this.galaxy);
    }

    public getMoney = () => {
        return this.galaxy.getMoney();
    }

    public canExpandPowerPlant = (colony: Model.Colony) => {
        return colony.canExpandPowerPlant(this.galaxy);
    }

    public getPowerUsageEff = (colony: Model.Colony) => {
        return colony.getPowerUsageEff(this.galaxy);
    }

    public getEnergyPrice = (colony: Model.Colony) => {
        return colony.getEnergyPrice(this.galaxy);
    }

    public getGalacticDemands = (productType: Model.Product) => {
        return this.galaxy.getGalacticDemands(productType);
    }

    public getGalacticProdCap = (productType: Model.Product) => {
        return this.galaxy.getGalacticProdCap(productType);
    }

    public getGalacticSupplies = (productType: Model.Product) => {
        return this.galaxy.getGalacticSupplies(productType);
    }

    public getPlanet = (at: Model.CoorT) => {
        return this.galaxy.getObj(at, Model.MapDataKind.Planet);
    }

    public getNumUsedTraders = (from: Model.Colony, to: Model.Colony) => {
        return this.galaxy.getNumUsedTraders(from, to);
    }

    public getRouteFuelEff = (from: Model.Colony, to: Model.Colony) => {
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

    public isRetired = (fleet: Model.Fleet) => {
        return fleet.isRetire();
    }

    public getNumColonizedPlanets = () => {
        return this.galaxy.getNumColonizedPlanets();
    }
}

export class GalaxyWriteProxy {

    constructor(private galaxy: Model.Galaxy) { }

    public colonizePlanet = (planet: Model.Planet, population: number) => {
        return this.galaxy.colonizePlanet(planet, population);
    }

    public expandPowerPlant = (colony: Model.Colony) => {
        colony.expandPowerPlanet(this.galaxy);
    }

    public withdraw = (amount: number) => {
        this.galaxy.withdraw(amount);
    }

    public shutdownIndustry = (colony: Model.Colony, industry: Model.Industry) => {
        this.galaxy.shutdownIndustry(colony, industry);
    }

    public addIndustry = (productType: Model.Product, colony: Model.Colony) => {
        return this.galaxy.addIndustry(productType, colony);
    }

    public addTradeFleet = (from: Model.Colony, to: Model.Colony) => {
        return this.galaxy.addTradeFleet(from, to);
    }

    public addTrader = () => {
        return this.galaxy.addTrader();
    }

    public turn = () => {
        return this.galaxy.turn();
    }

    public retire = (fleet: Model.Fleet) => {
        fleet.retire();
    }
}
