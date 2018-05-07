import OrderListMap from "./order_list_map";

export default class OrderListSet<T> {
    private map = new OrderListMap<T, boolean>(this.cmp);

    constructor(
        private readonly cmp?: (a: T, b: T) => number,
    ) { }

    public add(...key: T[]) {
        this.map.set(true, ...key);
        return this;
    }

    public has(...key: T[]) {
        return this.map.get(...key) !== undefined;
    }

    public delete(...key: T[]) {
        return this.map.delete(...key);
    }

    public size() {
        return this.map.size();
    }

    public values() {
        return this.map.keys();
    }

    public [Symbol.iterator]() {
        return this.values();
    }
}
