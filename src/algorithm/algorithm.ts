export * from "./minheap";
export * from "./mymath";
export * from "./trie";
export * from "./bimap";
export * from "./unionfind";
export * from "./graph";

import * as Immutable from "immutable";

export interface IRange {
    low: number;
    high: number;
}

/**
 *  Returns an indicator between 0 and 1 from the low side.
 *  Use 1-position to get an indicator from the high side.
 */
export function position(r: IRange, cursor: number) {
    const numerator = cursor - r.low;
    const denominator = r.high - r.low;

    console.assert(denominator >= 0, "high < low, bug");

    if (numerator < 0) {
        return 0; // none
    }
    if (denominator === 0) {
        return 1; // infinity
    }
    return Math.min(1, numerator / denominator);
}

export function randomBetween(r: IRange) {
    return Math.random() * (r.high - r.low) + r.low;
}

export function rangeMean(r: IRange) {
    return (r.low + r.high) / 2;
}

export function updateRange(r: IRange, value: number): IRange {
    return {
        low: Math.min(r.low, value),
        high: Math.max(r.high, value),
    };
}

export function bound(r: IRange, val: number) {
    const low = r.low;
    const high = r.high;
    return Math.min(Math.max(low, val), high);
}

export function range(low: number, high?: number): IRange {
    if (high === undefined) {
        return { low, high: low };
    }
    return { low, high };
}

export function rangeFrom(...nums: number[]): IRange {
    if (nums.length < 1) {
        throw new Error("need at least 1 number to form a range");
    }
    let low = nums[0];
    let high = nums[0];
    for (const num of nums) {
        if (num < low) {
            low = num;
        } else if (num > high) {
            high = num;
        }
    }
    return { low, high };
}

export function rangeTranslateMean(r: IRange, newMean: number) {
    const oldMean = rangeMean(r);
    const lowRange = oldMean - r.low;
    const highRange = r.high - oldMean;
    r.low = newMean - lowRange;
    r.high = newMean + highRange;
    console.assert(r.high >= r.low);
}

export function setRangeMin(r: IRange, min: number) {
    const diff = r.high - r.low;
    r.low = min;
    r.high = min + diff;
    console.assert(r.high >= r.low);
}

export function expandRange(r: IRange, factor: number) {
    const offset = (r.high - r.low) * factor;
    r.low = r.low - offset;
    r.high = r.high + offset;
    console.assert(r.high >= r.low);
}

export function contractRange(r: IRange, factor: number) {
    const offset = (r.high - r.low) * factor;
    r.low = r.low + offset;
    r.high = r.high - offset;
    console.assert(r.high >= r.low);
}

export function makePair<T, U>(t: T, u: U): [T, U] {
    return [t, u];
}

export function* shuffleSlice<T>(it: Iterable<T>) {
    const temp = Array.from(it);

    while (temp.length > 0) {
        const lastIdx = temp.length - 1;
        const idx = randomInt(0, lastIdx);
        yield temp[idx];

        if (idx === lastIdx) {
            temp.pop();
        } else {
            // swap the target with the last item
            temp[idx] = temp.pop()!;
        }
    }
}

export function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function takeRandom<T>(arr: T[]) {
    console.assert(arr.length > 0, "bug: cannot take from empty array");
    return arr[randomInt(0, arr.length - 1)];
}

/**
 * Given a sorted dense array, find the first element that is >= target
 */
export function lowerBound<T, U>(
    arr: T[],
    target: U,
    toVal: (val: T) => U,
    lessThan: (a: U, b: U) => boolean = (a, b) => a < b,
) {
    // binary search helper
    const binsearch = (low: number, high: number): [boolean, number, number] => {

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midVal = toVal(arr[mid]);
            if (lessThan(midVal, target)) {
                low = mid + 1;
            } else if (lessThan(target, midVal)) {
                high = mid - 1;
            } else {
                return [true, low, mid];
            }
        }

        return [false, low, low];
    };

    // keep repeating until duplicates run out
    {
        let [isFound, low, ret] = binsearch(0, arr.length - 1);
        let prevRet = ret;
        while (isFound) {
            prevRet = ret;
            // ret is the target and here we're interested
            // if any item in the lower partition is the same as the target
            [isFound, low, ret] = binsearch(low, ret - 1);
        }
        return prevRet;
    }
}

export function binarySearchPositiveNum(target: number, maxPivot: number, toVal: (pivot: number) => number) {
    console.assert(target > 0);

    let cur = 0;
    let prev = 0;
    while (true) {
        if (cur >= maxPivot) {
            return maxPivot;
        }

        const val = toVal(cur);
        if (val <= target) {
            // located the range; do binary search on it
            return binarySearchRange(target, range(prev, cur), toVal);
        }

        // try the next range through hundred-drupling the upper bound
        prev = cur;
        cur = (cur + 1) * 100;
    }
}

export function binarySearchRange(target: number, r: IRange, toVal: (pivot: number) => number) {

    if (target === 0) {
        return r.high;
    } else if (target === 1) {
        return r.low;
    }

    let low = r.low;
    let high = r.high;

    // we only care about 2 decimal places (I am not a mathematician)
    while (high - low > 0.01) {

        const pivot = (low + high) / 2;
        const pivotVal = toVal(pivot);
        if (pivotVal > target) {
            low = pivot;
        } else {
            high = pivot;
        }
    }
    return low;
}

export function cmpStr(a: string, b: string) {
    if (a < b) {
        return -1;
    } else if (b < a) {
        return 1;
    }
    return 0;
}

export function defaultZero(num?: number) {
    return num === undefined ? 0 : num;
}

export function getQty<T>(map: Map<T, number>, key: T) {
    const qty = map.get(key);
    return defaultZero(qty);
}

export function swap<T>(arr: T[], i: number, j: number) {
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
}

export function* seq(start: number = 0) {
    for (let i = start; ; i++) {
        yield i;
    }
}

export function* take<T>(it: IterableIterator<T>, num: number) {
    let i = 0;
    for (const item of it) {
        if (++i > num) {
            break;
        }
        yield item;
    }
}

export function* repeat<T>(data: T) {
    while (true) {
        yield data;
    }
}

export function isSorted<T>(it: T[], lessThan = (a: T, b: T) => a < b) {
    let prev;
    for (const cur of it) {
        if (prev !== undefined && lessThan(cur, prev)) {
            return false;
        }
        prev = cur;
    }
    return true;
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

export function setOrThrow<KeyT, ValT>(map: Map<KeyT, ValT>, key: KeyT, val: ValT) {
    const ret = map.get(key);
    if (ret !== undefined) {
        throw new Error("the map already has an entry for the given key");
    }
    map.set(key, val);
}

export function mapGet<KeyT, ValT>(map: Map<KeyT, ValT>, key: KeyT, defaultVal?: ValT): Option<ValT> {
    const result = map.get(key);
    if (result === undefined) {
        if (defaultVal !== undefined) {
            return Option.some(defaultVal);
        }
        return Option.none();
    } else {
        return Option.some(result);
    }
}

export function mapAdd<KeyT>(
    map1: IterableIterator<[KeyT, number]> | Map<KeyT, number>,
    map2: IterableIterator<[KeyT, number]> | Map<KeyT, number>,
) {
    const ret = new Map<KeyT, number>(map1);
    for (const [key, val] of map2) {
        getAndSum(ret, key, val);
    }
    return ret;
}

export function mapSubtract<KeyT>(
    map1: IterableIterator<[KeyT, number]> | Map<KeyT, number>,
    map2: IterableIterator<[KeyT, number]> | Map<KeyT, number>,
) {
    const ret = new Map<KeyT, number>(map1);
    for (const [key, val] of map2) {
        getAndSum(ret, key, -val);
    }
    return ret;
}

export function getAndSum<KeyT>(map: Map<KeyT, number>, key: KeyT, val: number) {
    const sum = getQty(map, key) + val;
    if (sum === 0) {
        map.delete(key);
        return 0;
    }
    map.set(key, sum);
    return sum;
}

export function* mapFilter<KeyT, ValT>(map: Map<KeyT, ValT>, pred: (val: ValT) => boolean) {
    for (const [key, val] of map) {
        if (pred(val)) {
            yield [key, val] as [KeyT, ValT];
        }
    }
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

export function group<T, U>(valFn: (t: T) => U, ...vals: T[]) {
    const ret = new Map<U, T[]>();
    for (const val of vals) {
        const u = valFn(val);
        getOrSet(ret, u, () => []).push(val);
    }
    return ret;
}

export function partition<T>(arr: T[], pred: (val: T) => boolean) {
    return arr
        .reduce(([good, bad], cur) => {
            if (pred(cur)) {
                good.push(cur);
            } else {
                bad.push(cur);
            }
            return [good, bad] as [T[], T[]];
        }, [[], []] as [T[], T[]]);
}

export class Option<T> {

    public static wrap<T>(val?: T) {
        const ret = new Option<T>();
        ret.val = val;
        return ret;
    }

    public static some<T>(val: T) {
        if (val === undefined) {
            throw new Error("some cannot be undefined values");
        }
        return Option.wrap(val);
    }

    public static none<T>() {
        return new Option<T>();
    }

    private val?: T;

    public then<U>(callback: (val: T) => Option<U>) {
        if (this.val !== undefined) {
            return callback(this.val);
        } else {
            return Option.none<U>();
        }
    }

    public thenSome<U>(callback: (val: T) => U) {
        if (this.val !== undefined) {
            return Option.some(callback(this.val));
        } else {
            return Option.none<U>();
        }
    }

    public runSome(callback: (val: T) => void) {
        if (this.val !== undefined) {
            callback(this.val);
        }
    }

    public filter(pred: (val: T) => boolean) {
        if (this.val !== undefined && pred(this.val)) {
            return Option.some(this.val);
        } else {
            return Option.none<T>();
        }
    }

    public unwrap(defaultVal?: T) {
        if (this.val === undefined) {
            if (defaultVal !== undefined) {
                return defaultVal;
            }
            throw new Error("cannot unwrap a none value");
        }
        return this.val!;
    }

    public injectNone(badValFn: () => T): Option<T> {
        return this.matchMap(
            () => this,
            () => Option.some(badValFn()),
        );
    }

    public match(
        some: (val: T) => void,
        none = () => { /* empty */ },
    ) {
        if (this.val === undefined) {
            none();
        } else {
            some(this.val);
        }
    }

    public matchMap<U>(
        some: (val: T) => Option<U>,
        none = () => Option.none<U>(),
    ) {
        if (this.val === undefined) {
            return none();
        } else {
            return some(this.val);
        }
    }

    public isSome() {
        return this.val !== undefined;
    }

    public isNone() {
        return !this.isSome();
    }
}
