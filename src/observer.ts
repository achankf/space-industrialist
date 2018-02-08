import * as Algo from "./algorithm/algorithm.js";

export interface IObserver<ModelT, ChannelT> {
    update(model: ModelT, channels: Set<ChannelT>): void;
}

export class Subject<ModelT, ChannelT> {

    private observers = new Set<IObserver<ModelT, ChannelT>>();
    private updateSet = new Set<ChannelT>();

    public subscribe(observer: IObserver<ModelT, ChannelT>) {

        console.assert(!this.observers.has(observer), "go fix caller: duplicate observable subscription");

        this.observers.add(observer);
    }

    public unsubscribe(observer: IObserver<ModelT, ChannelT>) {
        const result = this.observers.delete(observer);
        console.assert(result, "fix caller: observable doesn't exit");
    }

    public queueUpdate(...channelTypes: ChannelT[]) {
        channelTypes.forEach((channel) => this.updateSet.add(channel));
    }

    public update(model: ModelT) {
        for (const observable of this.observers) {
            observable.update(model, new Set(this.updateSet));
        }
        this.updateSet.clear();
    }
}
