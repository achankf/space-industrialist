import Dexie from "dexie";
import * as Model from "./model/model";
import { Subject } from "./observer";
import * as View from "./view/view";

export enum UpdateChannel {
    DataChange,
    TurnChange,
    MapChange,
    RecreateIndustryLayout,
}

export interface ISaveData {
    galaxySave: Model.IGalaxySaveData;
    mapViewSave: View.IMapViewSaveData;
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
        return new Game(saveData);
    }

    public galaxyProxy: GalaxyProxy;

    private galaxy: Model.Galaxy;
    private readonly subject = new Subject<this, UpdateChannel>();
    private readonly closables = new Set<View.ClosableView>();
    private readonly isPinned = new Set<View.ClosableView>();
    private gameLoopId?: number;
    private timePerFrame = 50;
    private autoSaveSeconds = 60 * 1; // 1 minute
    private autoSaveId?: number;

    private mapView: View.MapView;
    private readonly menu: View.Menu;

    private db = new DB();

    constructor(saveData?: ISaveData) {
        this.menu = new View.Menu(this);
        this.reload(saveData);
    }

    public reload(saveData?: ISaveData) {
        this.isPinned.clear();
        this.closeAll();

        if (saveData) {
            this.galaxy = Model.Galaxy.createFrom(saveData.galaxySave);
            this.mapView = new View.MapView(this, saveData);
        } else {
            this.galaxy = new Model.Galaxy();
            this.galaxy.addPlanets(20, 1);
            this.mapView = new View.MapView(this);
        }

        this.galaxyProxy = new GalaxyProxy(this.galaxy);

        // unsubsribe and then resubsribe
        this.subject.clear();
        this.subscribe(this.menu); // unchanged
        this.subscribe(this.mapView);

        // force-update the views (mainly mapview)
        this.queueUpdate(UpdateChannel.DataChange, UpdateChannel.TurnChange, UpdateChannel.MapChange);

        this.pause();
    }

    public start() {
        this.resume();
        this.resumeAutoSave();
    }

    public resume() {

        if (this.gameLoopId !== undefined) {
            clearInterval(this.gameLoopId);
        }

        this.gameLoopId = setInterval(() => {
            if (this.galaxy.turn()) {
                this.subject.queueUpdate(UpdateChannel.TurnChange);
            }
            this.subject.queueUpdate(UpdateChannel.DataChange);
        }, this.timePerFrame);
    }

    public fastForward() {
        console.assert(this.canFastForward());
        this.timePerFrame -= 40;
        this.resume();
    }

    public slowDown() {
        console.assert(this.canSlowDown());
        this.timePerFrame += 40;
        this.resume();
    }

    public canFastForward() {
        return this.timePerFrame > 20;
    }

    public canSlowDown() {
        return this.timePerFrame < 100;
    }

    public pause() {
        if (this.gameLoopId !== undefined) {
            clearInterval(this.gameLoopId);
            this.gameLoopId = undefined;
        }
    }

    public isGameRunning() {
        return this.gameLoopId !== undefined;
    }

    public startRendering() {
        const startRender = () => {
            this.subject.update(this);
            requestAnimationFrame(() => startRender());
        };

        startRender();
    }

    public unsubscribe(obs: View.Observer) {
        this.subject.unsubscribe(obs);
    }

    public subscribe(...obs: View.Observer[]) {
        this.subject.subscribe(...obs);
    }

    public queueUpdate(...channelTypes: UpdateChannel[]) {
        this.subject.queueUpdate(...channelTypes);
    }

    public addClosable(obs: View.ClosableView) {
        this.closables.add(obs);
        this.subject.subscribe(obs);
    }

    public pin(closable: View.ClosableView) {
        this.isPinned.add(closable);
    }

    public close(closable: View.ClosableView) {
        this.unsubscribe(closable);
        closable.view.remove();
        const isDeleted = this.closables.delete(closable);
        this.isPinned.delete(closable);
        console.assert(isDeleted);
    }

    public closeAll() {
        for (const closable of this.closables) {
            if (!this.isPinned.has(closable)) {
                this.close(closable);
            }
        }
    }

    public serialize(): ISaveData {
        const galaxySave = this.galaxy.serialize();
        const mapViewSave = this.mapView.serialize();

        return {
            galaxySave,
            mapViewSave,
        };
    }

    public async save() {
        const saveData = this.serialize();
        return this.db.save(saveData);
    }

    private resumeAutoSave() {
        if (this.autoSaveId !== undefined) {
            clearInterval(this.autoSaveId);
        }

        this.autoSaveId = setInterval(() => {
            this.save();
        }, this.autoSaveSeconds * 1000);
    }
}

/**
 * All views should use this class to interact with the Galaxy object.
 */
export class GalaxyProxy {
    constructor(private galaxy: Model.Galaxy) { }

    public exists(obj: Model.ILocatable) {
        return this.galaxy.exists(obj);
    }

    public getFleetSpeed(fleet: Model.Fleet) {
        return fleet.getSpeed(this.galaxy);
    }

    public getCoor(obj: Model.ILocatable | Model.Colony) {
        return this.galaxy.getCoor(obj);
    }

    public searchNearbyObjs(at: Model.CoorT, radius: number = 0, minDistance = 0) {
        return this.galaxy.searchNearbyObjs(at, radius, minDistance);
    }

    public getTradeRoutes() {
        return this.galaxy.getTradeRoutes();
    }

    public colonizePlanet(planet: Model.Planet, population: number) {
        return this.galaxy.colonizePlanet(planet, population);
    }

    public expandPowerPlant(colony: Model.Colony) {
        colony.expandPowerPlanet(this.galaxy);
    }

    public getObjs() {
        return this.galaxy.getObjs();
    }

    public getAngle(fleet: Model.Fleet) {
        return fleet.getAngle(this.galaxy);
    }

    public getIndustries(colony: Model.Colony) {
        return this.galaxy.getIndustries(colony);
    }

    public withdraw(amount: number) {
        this.galaxy.withdraw(amount);
    }

    public shutdownIndustry(colony: Model.Colony, industry: Model.Industry) {
        this.galaxy.shutdownIndustry(colony, industry);
    }

    public addIndustry(productType: Model.Product, colony: Model.Colony) {
        return this.galaxy.addIndustry(productType, colony);
    }

    public prodCap(industry: Model.Industry) {
        return industry.prodCap(this.galaxy);
    }

    public usedEnergy(industry: Model.Industry) {
        return industry.usedEnergy(this.galaxy);
    }

    public getNumColonists() {
        return this.galaxy.getNumColonists();
    }

    public growthRate(colony: Model.Colony) {
        return colony.growthRate(this.galaxy);
    }

    public getTotalPowerUsage(colony: Model.Colony) {
        return colony.getTotalPowerUsage(this.galaxy);
    }

    public getMoney() {
        return this.galaxy.getMoney();
    }

    public canExpandPowerPlant(colony: Model.Colony) {
        return colony.canExpandPowerPlant(this.galaxy);
    }

    public getPowerUsageEff(colony: Model.Colony) {
        return colony.getPowerUsageEff(this.galaxy);
    }

    public getEnergyPrice(colony: Model.Colony) {
        return colony.getEnergyPrice(this.galaxy);
    }

    public getGalacticDemands(productType: Model.Product) {
        return this.galaxy.getGalacticDemands(productType);
    }

    public getGalacticProdCap(productType: Model.Product) {
        return this.galaxy.getGalacticProdCap(productType);
    }

    public getGalacticSupplies(productType: Model.Product) {
        return this.galaxy.getGalacticSupplies(productType);
    }

    public getPlanet(at: Model.CoorT) {
        return this.galaxy.getObj(at, Model.MapDataKind.Planet);
    }

    public addTradeFleet(from: Model.Colony, to: Model.Colony) {
        return this.galaxy.addTradeFleet(from, to);
    }

    public getNumUsedTraders(from: Model.Colony, to: Model.Colony) {
        return this.galaxy.getNumUsedTraders(from, to);
    }

    public getRouteFuelEff(from: Model.Colony, to: Model.Colony) {
        return this.galaxy.getRouteFuelEff(from, to);
    }

    public getNumUnusedTraders() {
        return this.galaxy.getNumUnusedTraders();
    }

    public getYear() {
        return this.galaxy.getYear();
    }

    public getDay() {
        return this.galaxy.getDay();
    }

    public getScore() {
        return this.galaxy.getScore();
    }

    public addTrader() {
        return this.galaxy.addTrader();
    }
}
