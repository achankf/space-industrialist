import * as Model from "./model/model.js";
import { Subject } from "./observer.js";
import * as View from "./view/view.js";

export enum UpdateChannel {
    DataChange,
    RecreateMap,
    DataTurnChange,
    MapChange,
    RecreateIndustryLayout,
}

export class Game {
    private readonly subject = new Subject<this, UpdateChannel>();
    private readonly closables = new Set<View.ClosableView>();
    private readonly isPinned = new Set<View.ClosableView>();
    private gameLoopId: number | undefined;

    constructor(
        public readonly galaxy: Model.Galaxy,
    ) { }

    public start() {
        console.assert(!this.isGameRunning());
        this.gameLoopId = setInterval(() => {
            const list = [UpdateChannel.DataChange];
            if (this.galaxy.turn()) {
                list.push(UpdateChannel.DataTurnChange);
            }
            this.subject.queueUpdate(...list);
        }, 50);
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

    public subscribe(obs: View.Observer) {
        this.subject.subscribe(obs);
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
}
