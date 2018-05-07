import Trie from "./trie";

export default class OrderListMap<T, U> {
    private trie = new Trie<U>();

    constructor(
        private readonly cmp?: (a: T, b: T) => number,
    ) { }

    public set(val: U, ...key: T[]) {
        this.trie.set(this.sortKey(key), val);
        return this;
    }

    public get(...key: T[]) {
        return this.trie.get(this.sortKey(key));
    }

    public has(...key: T[]) {
        return this.trie.get(this.sortKey(key)) !== undefined;
    }

    public delete(...key: T[]) {
        return this.trie.delete(this.sortKey(key));
    }

    public clear() {
        this.trie = new Trie();
    }

    public size() {
        return this.trie.size();
    }

    public [Symbol.iterator](): IterableIterator<[T[], U]> {
        return this.trie.entries();
    }

    public entries(): IterableIterator<[T[], U]> {
        return this.trie.entries();
    }

    public keys() {
        return this.trie.keys() as IterableIterator<T[]>;
    }

    public values() {
        return this.trie.values();
    }

    public getOrSet(defaultVal: () => U, ...key: T[]) {
        return this.trie.getOrSet(this.sortKey(key), defaultVal);
    }

    private sortKey(key: T[]) {
        return key.sort(this.cmp);
    }
}
