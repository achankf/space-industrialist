
/**
 * Bi-direction map, based on two Map objects. Use this class for data that has a bijective relationship.
 */
export class BiMap<T, U> {

    private leftMap: Map<T, U>;
    private rightMap: Map<U, T>;

    constructor(...data: Array<[T, U]>) {
        this.leftMap = new Map(data);
        this.rightMap = new Map(data.map(([t, u]) => [u, t] as [U, T]));
    }

    public size() {
        console.assert(this.leftMap.size === this.rightMap.size);
        return this.leftMap.size;
    }

    public set(left: T, right: U) {
        this.leftMap.set(left, right);
        this.rightMap.set(right, left);
    }

    public deleteLeft(left: T) {
        const right = this.leftMap.get(left);
        return right !== undefined && this.delete(left, right);
    }

    public deleteRight(right: U) {
        const left = this.rightMap.get(right);
        return left !== undefined && this.delete(left, right);
    }

    public getRight(left: T) {
        return this.leftMap.get(left);
    }

    public getLeft(right: U) {
        return this.rightMap.get(right);
    }

    public hasLeft(left: T) {
        return this.leftMap.has(left);
    }

    public hasRight(right: U) {
        return this.rightMap.has(right);
    }

    public lefts() {
        return this.leftMap.keys();
    }

    public rights() {
        return this.rightMap.keys();
    }

    public [Symbol.iterator]() {
        return this.entries();
    }

    public entries() {
        return this.leftMap.entries();
    }

    private delete(left: T, right: U) {
        const ret1 = this.leftMap.delete(left);
        const ret2 = this.rightMap.delete(right);
        console.assert(ret1);
        console.assert(ret2);
        return true;
    }
}
