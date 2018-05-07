export * from "./mymath";
export * from "./trie";
export * from "./unionfind";
export * from "./graph";

import * as Immutable from "immutable";

export function getQty<T>(map: Map<T, number>, key: T, defaultVal = 0) {
    const qty = map.get(key);
    return qty === undefined ? defaultVal : qty;
}

export function getOr<KeyT, ValT>(map: Map<KeyT, ValT>, key: KeyT, defaultFn: () => ValT) {
    const ret = map.get(key);
    return ret === undefined ? defaultFn() : ret;
}

export function getOrSet<KeyT, ValT>(map: Map<KeyT, ValT>, key: KeyT, defaultFn: () => ValT) {
    const ret = map.get(key);
    if (ret === undefined) {
        const def = defaultFn();
        map.set(key, def);
        return def;
    }
    return ret;
}

export function mapSum<KeyT>(map: Map<KeyT, number>, key: KeyT, val: number) {
    const sum = getQty(map, key) + val;
    map.set(key, sum);
    return sum;
}

export function* combineIt<T>(...its: Array<IterableIterator<T> | T[] | Set<T> | Immutable.Seq.Indexed<T>>) {
    for (const it of its) {
        for (const v of it) {
            yield v;
        }
    }
}

/**
 *  Return a list of unique values from a sorted list of values
 * @param sortedVals a sorted list
 * @param isEq equality comparator
 */
export function* uniq<T>(sortedVals: T[], isEq = (a: T, b: T) => a === b) {

    if (sortedVals.length > 0) {
        let cur = sortedVals[0];
        for (const val of sortedVals) {
            if (!isEq(val, cur)) {
                yield cur;
                cur = val;
            }
        }
        yield cur; // either the last value is unique, or the previous value is not unique but haven't reported
    }
}
