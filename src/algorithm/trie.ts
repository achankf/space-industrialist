import * as Algo from "./algorithm";

export default class Trie<ValT> {

    public static make<V>(...list: Array<[any[], V]>) {
        return list
            .reduce((acc, [keyString, val]) => acc
                .set(keyString, val),
                new Trie<V>());
    }

    private keyChar2: any;
    private end?: ValT;
    private next = new Map<any, Trie<ValT>>();
    private size2 = 0;

    public size() {
        return this.size2;
    }

    public get(key: any[]) {
        const node = this.traverse(key);
        return node !== undefined ? node.end : undefined;
    }

    public keyChar() {
        return this.keyChar;
    }

    public delete(key: any[]) {
        const ancestors: Array<[any, Trie<ValT>]> = [];
        const node = this.traverse(key, (kc, n) => ancestors.push([kc, n]));
        if (!node || node.end === undefined) {
            return false;
        }
        --this.size2;

        // clean up unused structure
        let cur = node;
        for (let i = ancestors.length - 1; i >= 0; i--) {

            // current node is still in used by other keys
            if (cur.next.size !== 0) {
                break;
            }

            // otherwise delete the current (unused) structure
            const [kc, parent] = ancestors[i];
            console.assert(parent.next.size > 0);
            parent.next.delete(kc);
            cur = parent;
        }
        return true;
    }

    public set(key: any[], val: ValT) {
        let temp = this as Trie<ValT>;
        key.forEach((keyChar) => {

            if (keyChar === undefined) {
                throw new Error("undefined not allowed as part of the key");
            }

            let next = temp.next.get(keyChar);
            if (next === undefined) {
                next = new Trie();
                temp.next.set(keyChar, next);
            }
            next.keyChar2 = keyChar;
            temp = next;
        });
        temp.end = val;
        ++this.size2;
        return this;
    }

    public getOrSet(key: any[], defaulVal: () => ValT) {
        let temp = this as Trie<ValT>;
        key.forEach((keyChar) => {

            if (keyChar === undefined) {
                throw new Error("undefined not allowed as part of the key");
            }

            let next = temp.next.get(keyChar);
            if (next === undefined) {
                next = new Trie();
                temp.next.set(keyChar, next);
            }
            next.keyChar2 = keyChar;
            temp = next;
        });
        if (temp.end === undefined) {
            temp.end = defaulVal();
            ++this.size2;
        }
        return temp.end;
    }

    /**
     * For debugging and unit-testing only.
     * @param key the key
     */
    public getFanout(key: any[]) {
        const node = this.traverse(key);
        if (node) {
            return node.next.size;
        }
        return 0;
    }

    public [Symbol.iterator]() {
        return this.entries();
    }

    public *entries() {
        const allNodes = Algo.depthFirstTraversal(
            this as Trie<ValT>,
            (me) => me.next.values(),
        );
        const key: any[] = [];
        let curDepth = 0;
        for (const [node, depth] of allNodes) {
            const depthDiff = curDepth - depth;
            for (let i = 0; i < depthDiff; i++) {
                key.pop();
                curDepth--;
            }

            if (node.keyChar2 !== undefined) {
                key.push(node.keyChar2);
            } else {
                console.assert(depth === 0);
            }
            ++curDepth;

            if (node.end !== undefined) {
                yield [key.slice(), node.end] as [any[], ValT];
            }
        }
    }

    public *keys() {
        for (const [key] of this.entries()) {
            yield key;
        }
    }

    public *values() {
        for (const [, val] of this.entries()) {
            yield val;
        }
    }

    public *nextOrder() {
        for (const subTrie of this.next.values()) {
            yield [subTrie.keyChar(), subTrie] as [any, Trie<ValT>];
        }
    }

    public traverse(key: any[], visit: (keyChar: any, node: Trie<ValT>) => void = () => { /* empty */ }) {
        let cur: Trie<ValT> = this;

        const isFound = key.every((keyChar) => {
            const temp = cur.next.get(keyChar);
            if (temp === undefined) {
                return false;
            }
            visit(keyChar, cur);
            cur = temp;
            return true;
        });
        return isFound ? cur : undefined;
    }
}
