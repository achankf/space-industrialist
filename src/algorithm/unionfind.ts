import * as Algo from "./algorithm";

export class UnionFind<T> {

    private toId = new Map<T, number>();
    private parents = new Map<number, [number, number]>();
    private id = 0;

    constructor(sets?: Set<T>) {
        if (sets) {
            for (const item of sets) {
                this.add(item);
            }
        }
    }

    public add(item: T) {
        let id = this.toId.get(item);
        if (id !== undefined) {
            return id;
        }

        // set item to be item's parent
        id = ++this.id;
        this.toId.set(item, id);
        return Algo.getOrSet(
            this.parents,
            id,
            () => [id, 0] as [number, number]);
    }

    public union(left: T, right: T) {
        const [lRoot, lRank] = this.find(left);
        const [rRoot, rRank] = this.find(right);

        if (lRoot === rRoot) {
            return;
        }

        if (lRank < rRank) {
            this.parents.set(lRoot, [rRoot, lRank]);
        } else if (lRank > rRank) {
            this.parents.set(rRoot, [lRoot, rRank]);
        } else {
            this.parents.set(lRoot, [rRoot, rRank + 1]);
        }
    }

    public isSameSet(left: T, right: T) {
        const [lParent] = this.find(left);
        const [rParent] = this.find(right);
        return lParent === rParent;
    }

    private find(node: T) {

        const path: number[] = [];
        let prev = this.toId.get(node)!;
        while (true) {

            const [parent, rank] = this.parents.get(prev)!;

            if (prev === parent) {
                // path compression
                const ret = [parent, rank] as [number, number];
                for (const id of path) {
                    this.parents.set(id, [...ret] as [number, number]);
                }
                return ret;
            }

            // collect ancestors for future path compression
            path.push(prev);
            prev = parent;
        }
    }
}
