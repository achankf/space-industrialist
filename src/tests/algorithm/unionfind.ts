import { UnionFind } from "../../algorithm/unionfind.js";

const sets = new UnionFind(new Set([1, 2, 3, 4, 5]));

sets.union(1, 2);
console.assert(sets.isSameSet(1, 2));
console.assert(!sets.isSameSet(1, 3));
console.assert(!sets.isSameSet(1, 4));
console.assert(!sets.isSameSet(1, 5));
console.assert(!sets.isSameSet(2, 3));
console.assert(!sets.isSameSet(2, 4));
console.assert(!sets.isSameSet(2, 5));

sets.union(4, 5);
console.assert(sets.isSameSet(4, 5));
console.assert(!sets.isSameSet(4, 1));
console.assert(!sets.isSameSet(4, 2));
console.assert(!sets.isSameSet(4, 3));
console.assert(!sets.isSameSet(5, 1));
console.assert(!sets.isSameSet(5, 2));
console.assert(!sets.isSameSet(5, 3));

// 3 is alone
console.assert(!sets.isSameSet(3, 1));
console.assert(!sets.isSameSet(3, 2));
console.assert(!sets.isSameSet(3, 4));
console.assert(!sets.isSameSet(3, 5));

sets.union(2, 5);
console.assert(sets.isSameSet(1, 2));
console.assert(sets.isSameSet(1, 4));
console.assert(sets.isSameSet(1, 5));
console.assert(sets.isSameSet(2, 1));
console.assert(sets.isSameSet(2, 4));
console.assert(sets.isSameSet(2, 5));
console.assert(sets.isSameSet(4, 1));
console.assert(sets.isSameSet(4, 2));
console.assert(sets.isSameSet(4, 5));
console.assert(sets.isSameSet(5, 1));
console.assert(sets.isSameSet(5, 2));
console.assert(sets.isSameSet(5, 4));
console.assert(!sets.isSameSet(3, 1));
console.assert(!sets.isSameSet(3, 2));
console.assert(!sets.isSameSet(3, 4));
console.assert(!sets.isSameSet(3, 1));
console.assert(!sets.isSameSet(3, 5));
