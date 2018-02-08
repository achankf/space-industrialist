import * as Algo from "../../algorithm/algorithm.js";
import { MinHeap } from "../../algorithm/minheap.js";

export function allMinHeapTests() {
    const heapTest = (size: number) => {
        const b = new MinHeap(Algo.shuffleSlice(Algo.take(Algo.seq(), size)))
            ;
        const slice = b.slice();
        const sorted = Array.from(b.sort());
        return [slice, sorted, Algo.isSorted(sorted)];
    };

    const heapInsertTest = (size: number) => {
        const b = new MinHeap();
        for (const val of Algo.shuffleSlice(Algo.take(Algo.seq(), size))) {
            b.insert(val);
        }
        const slice = b.slice();
        const sorted = Array.from(b.sort());
        return [slice, sorted, Algo.isSorted(sorted)];
    };

    const heapInPlaceSortTest = (size: number) => {
        const b = new MinHeap(
            Algo.shuffleSlice(Algo.take(Algo.seq(), size)),
            (a, c) => a > c,
        )
            ;
        const slice = b.slice();
        const sorted = Array.from(b.reverseSort());
        return [slice, sorted, Algo.isSorted(sorted)];
    };

    for (const i of Algo.take(Algo.seq(1000000), 10)) {
        const [slice, sorted, result] = heapTest(i);
        console.log(slice);
        console.log(sorted);
        console.log(result);
        console.assert(result as boolean);
    }
    for (const i of Algo.take(Algo.seq(1000000), 10)) {
        const [slice, sorted, result] = heapInPlaceSortTest(i);
        console.log(slice);
        console.log(sorted);
        console.log(result);
        console.assert(result as boolean);
    }
    for (const i of Algo.take(Algo.seq(1000000), 10)) {
        const [slice, sorted, result] = heapInsertTest(i);
        console.log(slice);
        console.log(sorted);
        console.log(result);
        console.assert(result as boolean);
    }

    for (const i of Algo.take(Algo.seq(1000), 10)) {
        const t = Array.from(Algo.take(Algo.seq(1), 1000))
            .map((n) => Array.from(Algo.take(Algo.repeat(n), 10)))
            .reduce((acc, cur) => acc.concat(cur), []);
        const b = new MinHeap(Algo.shuffleSlice(t));
        const slice = b.slice();
        const sorted = Array.from(b.sort());
        const result = Algo.isSorted(sorted);
        console.log(slice);
        console.log(sorted);
        console.log(result);
        console.assert(result as boolean);
    }

    {
        const t = Array.from(Algo.take(Algo.seq(1), 1000))
            .map((n) => Array.from(Algo.take(Algo.repeat(n), 10)))
            .reduce((acc, cur) => acc.concat(cur), []);
        const b = new MinHeap(Algo.shuffleSlice(t));
        const slice = b.slice();
        const sorted: number[] = [];
        let ret = b.pop();
        while (ret !== undefined) {
            sorted.push(ret);
            ret = b.pop();
        }
        const result = Algo.isSorted(sorted);
        console.log(slice);
        console.log(sorted);
        console.log(result);
        console.assert(result as boolean);
    }

    {
        const t = Array.from(Algo.take(Algo.seq(1), 1000))
            .map((n) => Array.from(Algo.take(Algo.repeat(n), 10)))
            .reduce((acc, cur) => acc.concat(cur), []);
        const b = new MinHeap(Algo.shuffleSlice(t));
        const slice = b.slice();
        const sorted = b.take(b.size());
        const result = Algo.isSorted(sorted);
        console.log(slice);
        console.log(sorted);
        console.log(result);
        console.assert(result as boolean);
    }
}

allMinHeapTests();
