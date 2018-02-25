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

    public galaxy: Model.Galaxy;
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
