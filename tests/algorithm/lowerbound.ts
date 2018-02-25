import * as Algo from "../../src/algorithm/algorithm";

console.assert(Algo.lowerBound([], 12345, (x) => x) === 0);
const arr1to5 = [1, 2, 3, 4, 5];
console.assert(Algo.lowerBound(arr1to5, 0, (x) => x) === 0); // all items > target
console.assert(Algo.lowerBound(arr1to5, 1, (x) => x) === 0);
console.assert(Algo.lowerBound(arr1to5, 2, (x) => x) === 1);
console.assert(Algo.lowerBound(arr1to5, 3, (x) => x) === 2);
console.assert(Algo.lowerBound(arr1to5, 4, (x) => x) === 3);
console.assert(Algo.lowerBound(arr1to5, 5, (x) => x) === 4);
console.assert(Algo.lowerBound(arr1to5, 6, (x) => x) === 5); // all items < target
console.assert(Algo.lowerBound(arr1to5, 999, (x) => x) === 5); // all items < target
const dup = [-10, -6, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 4, 5, 10];
console.assert(Algo.lowerBound(dup, -6, (x) => x) === 1);
console.assert(Algo.lowerBound(dup, 1, (x) => x) === 2);
// in between gaps
console.assert(Algo.lowerBound(dup, -7, (x) => x) === 1);
console.assert(Algo.lowerBound(dup, -5, (x) => x) === 2);
console.assert(Algo.lowerBound(dup, -4, (x) => x) === 2);
console.assert(Algo.lowerBound(dup, -3, (x) => x) === 2);
console.assert(Algo.lowerBound(dup, -2, (x) => x) === 2);
console.assert(Algo.lowerBound(dup, -1, (x) => x) === 2);
console.assert(Algo.lowerBound(dup, 0, (x) => x) === 2);
console.assert(Algo.lowerBound(dup, 6, (x) => x) === 14);
console.assert(Algo.lowerBound(dup, 7, (x) => x) === 14);
console.assert(Algo.lowerBound(dup, 8, (x) => x) === 14);
console.assert(Algo.lowerBound(dup, 9, (x) => x) === 14);
// search duplicate items
console.assert(Algo.lowerBound(dup, 2, (x) => x) === 3);
console.assert(Algo.lowerBound(dup, 3, (x) => x) === 9);
