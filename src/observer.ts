
export interface IObserver<ModelT, ChannelT> {
    update(model: ModelT, channels: Set<ChannelT>): void;
}

export class Subject<ModelT, ChannelT> {

    private observers = new Set<IObserver<ModelT, ChannelT>>();
    private updateSet = new Set<ChannelT>();

    public subscribe(...observers: Array<IObserver<ModelT, ChannelT>>) {
        console.assert(observers.every((o) => !this.observers.has(o)), "go fix caller: duplicate observable subscription");

        observers.forEach((o) => this.observers.add(o));
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
            observable.update(model, this.updateSet);
        }
        this.updateSet.clear();
    }

    public clear() {
        this.observers.clear();
        this.updateSet.clear();
    }
}
