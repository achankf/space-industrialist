import Trie from "./trie";

export default class TupleSet<KeyT extends any[]> {

    private trie: Trie<boolean>;

    constructor(
        ...data: KeyT[],
    ) {
        this.trie = Trie.make(...data.map((x) => [x, true] as [KeyT, boolean]));
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

    public add(key: KeyT) {
        this.trie.set(key, true);
        return this;
    }

    public delete(key: KeyT) {
        return this.trie.delete(key);
    }

    public [Symbol.iterator]() {
        return this.entries();
    }

    public entries() {
        return this.values();
    }

    public keys() {
        return this.trie.keys() as IterableIterator<KeyT>;
    }

    public values() {
        return this.keys();
    }

    public getOrAdd(key: KeyT) {
        return this.trie.getOrSet(key, () => true);
    }
}
