import { Trie, TupleMap } from "../../algorithm/trie.js";

const input1: Array<[any[], number]> = [
    [[1], 2],
    [[1, 2, 3, 4], 5],
    [[1, 2, 3], 1],
    [[], 12],
    [[7], 24],
    [[7, 6], 99],
    [["abc", 9, "a", 8], 123],
];

const t = Trie.make(...input1);
console.assert(t.get([1, 2, 3, 4]) === 5);
console.assert(t.get([1, 2, 3]) === 1);
console.assert(t.get([1]) === 2);
console.assert(t.get([]) === 12);
console.assert(t.get([7]) === 24);
console.assert(t.get([7, 6]) === 99);
console.assert(t.get([4]) === undefined);
console.assert(t.get([1, 2]) === undefined);
console.assert(t.get(["abc", 9, "a", 8]) === 123);
console.assert(t.get(["a"]) === undefined);

// test iterator

function compareTrieWithInput<ValT>(input: Array<[any[], ValT]>, trie: Trie<ValT> | TupleMap<any[], ValT>) {
    let size = 0;
    for (const [key, value] of trie) {
        const [, value2] = input.find(([key2]) => {
            return key2.length === key.length &&
                key.every((keyChar, i) => key2[i] === keyChar);
        })!;
        console.assert(value === value2);
        ++size;
    }
    console.assert(size === input.length);
}
compareTrieWithInput(input1, t);

console.assert(t.size() === 7);
console.assert(t.getFanout([]) === 3); // 1, 7, "abc"
console.assert(t.delete([]));
console.assert(t.size() === 6);
console.assert(t.getFanout([]) === 3); // 1, 7, "abc"
console.assert(t.delete([1]));
console.assert(t.size() === 5);
console.assert(t.getFanout([]) === 3); // 1, 7, "abc"
console.assert(t.getFanout([1]) === 1); // 2
console.assert(t.delete([1, 2, 3]));
console.assert(t.size() === 4);
console.assert(t.getFanout([1]) === 1); // 2
console.assert(t.delete([1, 2, 3, 4]));
console.assert(t.size() === 3);
console.assert(t.getFanout([]) === 2); // 7, "abc"
console.assert(t.getFanout([1]) === 0);
console.assert(!t.delete([1, 2, 3, 4]));
console.assert(t.size() === 3);
console.assert(!t.delete(["abc"]));
console.assert(t.size() === 3);

const input2: Array<[[number, number], number]> = [
    [[1, 2], 2],
    [[3, 4], 5],
];
const t2 = new TupleMap(...input2);
compareTrieWithInput(input2, t2);
