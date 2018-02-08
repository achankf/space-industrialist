import * as Algo from "./algorithm.js";

export class MinHeap<T> {

    public static heapify<T>(
        arr: T[],
        lessThan: (a: T, b: T) => boolean,
    ) {
        // walking up the heap by going backward
        for (let i = Math.floor((arr.length - 1) / 2); i >= 0; i--) {
            bubbleDown(arr, i, arr.length, lessThan);
        }
        return arr;
    }

    /**
     * Wraps a heapified array into a MinHeap without any checking whatsoever.
     * @param arr an heapified array slice, presumably generated from MinHeap.slice()
     * @param lessThan the comparator
     */
    public static unsafeWrap<T>(arr: T[], lessThan = (a: T, b: T) => a < b) {
        const ret = new MinHeap<T>([], lessThan);
        ret.arr = arr;
        return ret;
    }

    private arr: T[];

    constructor(
        it?: Iterable<T>,
        private lessThan = (a: T, b: T) => a < b,
    ) {
        this.arr = it ? Array.from(it) : [];
        MinHeap.heapify(this.arr, lessThan);
    }

    public size() {
        return this.arr.length;
    }

    public pop() {
        const ret = pop(this.arr, this.arr.length, this.lessThan); // swaps the head to the end
        const poped = this.arr.pop();
        console.assert(ret === poped);
        return ret;
    }

    public peek() {
        return this.arr[0];
    }

    public take(num: number) {
        if (num < 0) {
            throw new Error("cannot take negative items");
        }
        const max = Math.min(this.arr.length, num);
        const ret = new Array<T>(max);
        for (let i = 0; i < max; i++) {
            ret[i] = this.pop()!;
        }
        return ret;
    }

    public updateRoot(newValue: T) {
        this.arr[0] = newValue;
        bubbleDown(this.arr, 0, this.arr.length, this.lessThan);
    }

    public slice() {
        return this.arr.slice();
    }

    // return a sorted iterable ordered by the least priority (i.e. high-to-low)
    // this is *the* in-place version
    public reverseSort() {
        const arr = this.arr;
        this.arr = []; // clears the array in case for reusing this heap
        for (let len = arr.length; len > 0; len--) {
            pop(arr, len, this.lessThan);
        }
        return arr;
    }

    // return a sorted iterable ordered by the most priority (i.e. low-to-high)
    public *sort() {
        const arr = this.arr;
        this.arr = []; // clears the array in case for reusing this heap
        let val = pop(arr, arr.length, this.lessThan);
        while (val !== undefined) {
            yield arr.pop()!;
            val = pop(arr, arr.length, this.lessThan);
        }
    }

    public *sortSlice() {
        const arr = this.arr.slice();
        let val = pop(arr, arr.length, this.lessThan);
        while (val !== undefined) {
            yield arr.pop()!;
            val = pop(arr, arr.length, this.lessThan);
        }
    }

    public insert(data: T) {
        const idx = this.arr.length;
        this.arr.push(data);
        bubbleUp(this.arr, idx, this.lessThan);
    }
}

function ancestor(n: number, k: number) {
    return Math.floor((n + 1) / Math.pow(2, k) - 1);
}

function parent(n: number) {
    return ancestor(n, 1);
}

function leftChild(i: number) {
    return 2 * i + 1;
}

// pop swaps the root to the end of the array; caller is responsible for memeory management
function pop<T>(arr: T[], length: number, lessThan: (a: T, b: T) => boolean) {
    const lenMinus = length - 1;
    if (length === 0) {
        return;
    } else if (length === 1) {
        return arr[lenMinus];
    }

    const ret = arr[0];
    Algo.swap(arr, 0, lenMinus); // replace root with the last element and then bubbledown
    bubbleDown(arr, 0, lenMinus, lessThan);
    return ret;
}

function bubbleDown<T>(arr: T[], start: number, length: number, lessThan: (a: T, b: T) => boolean) {
    const root = arr[start];
    let i = start; // iterator starting at the root node defined by start
    while (true) {
        let candidate = leftChild(i);
        if (candidate >= length) { // left-child doesn't exist
            break;
        }

        const left = arr[candidate];
        const rightIdx = candidate + 1;
        if (rightIdx < length && // right-child exists and
            lessThan(arr[rightIdx], left)  // right child is less than left-child
        ) {
            candidate++;
        }

        if (lessThan(root, arr[candidate])) {
            break;
        }

        Algo.swap(arr, i, candidate);
        i = candidate;
    }
}

function bubbleUp<T>(arr: T[], start: number, lessThan: (a: T, b: T) => boolean) {

    // O(loglog n) comparisons to look for number of ancestors to be swapped
    // ... not that it's an optimization or anything, it's just a copy-paste
    // from my homework back in school
    const numAncestorsToBeSwapped = () => {
        if (start === 0) {
            return 0;
        }

        let high = (Math.log(start + 1) / Math.log(2));
        let cur = start;
        let low = 0;
        let pivot: number;

        // binary search on a branch of heap -- O(lglg n) comparisions
        while (true) {
            pivot = Math.floor((high + low) / 2);
            if (high < low) {
                break;
            }
            cur = ancestor(start, pivot);

            if (lessThan(arr[start], arr[cur])) {
                low = pivot + 1;
            } else if (lessThan(arr[cur], arr[start])) {
                high = pivot - 1;
            } else {
                break;
            }
        }

        // pivot + boundary case adjustment
        if (lessThan(arr[start], arr[parent(cur)])) {
            return pivot + 1;
        }
        return pivot;
    };

    const num = numAncestorsToBeSwapped();
    let it = start;
    let par;

    for (let i = 0; i < num; i++) {
        par = parent(it);
        Algo.swap(arr, it, par);
        it = par;
    }
}
