import Trie from "./trie";

export default class TupleMap<KeyT extends any[], ValT> {

    private trie: Trie<ValT>;

    constructor(
        ...data: Array<[KeyT, ValT]>,
    ) {
        this.trie = Trie.make(...data);
    }

    public clear() {
        this.trie = new Trie();
    }

    public size() {
        return this.trie.size();
    }

    public has(key: KeyT) {
        return this.trie.get(key) !== undefined;
    }

    public get(key: KeyT) {
        return this.trie.get(key);
    }

    public set(key: KeyT, value: ValT) {
        this.trie.set(key, value);
        return this;
    }

    public delete(key: KeyT) {
        return this.trie.delete(key);
    }

    public [Symbol.iterator]() {
        return this.entries();
    }

    public entries() {
        return this.trie.entries() as IterableIterator<[KeyT, ValT]>;
    }

    public keys() {
        return this.trie.keys() as IterableIterator<KeyT>;
    }

    public values() {
        return this.trie.values();
    }

    public getOrSet(key: KeyT, defaultVal: () => ValT) {
        return this.trie.getOrSet(key, defaultVal);
    }

    public *nextOrder() {
        return this.trie.nextOrder();
    }
}
