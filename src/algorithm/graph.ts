import * as Algo from "./algorithm";
import { UnionFind } from "./unionfind";

export type Graph<T> = Map<T, T[]>; // adjacency list

/**
 * Breadth First Traversal
 * @param root the root node
 * @param neighbours a function that return edges of a node
 * @param key turns a node into a unique value, needed if the neighbours
 *  are derived values instead of pointing to the actual nodes in the graph, then a key function must be provided.
 */
export function* breadthFirstTraversal<T, U>(
    root: T,
    neighbours: (vertex: T) => IterableIterator<T>,
    key?: (vertex: T) => U,
): IterableIterator<[T, number]> {

    const workList: Array<[T, number]> = [[root, 0]];
    const visited = new Set<T | U>();
    const keyit = key ? key : (me: T) => me;

    while (workList.length > 0) {
        const [cur, depth] = workList.shift()!;
        yield [cur, depth];
        visited.add(keyit(cur));
        const depth1 = depth + 1;

        for (const nei of neighbours(cur)) {
            visited.add(keyit(nei));
            if (!visited.has(keyit(nei))) {
                workList.push([nei, depth1]);
            }
        }
    }
}

/**
 * Depth First Traversal
 * @param root the root node
 * @param neighbours a function that return edges of a node
 * @param isVisited a function that indicates whether a node is visited; optional if the graph is a tree
 * @param markVisited a function that marks a node as visited; optional if the graph is a tree
 */
export function* depthFirstTraversal<T, U>(
    root: T,
    neighbours: (vertex: T) => IterableIterator<T>,
): IterableIterator<[T, number]> {

    const workList: Array<[T, number]> = [[root, 0]];
    const visited = new Set<T | U>();

    while (workList.length > 0) {
        const [cur, depth] = workList.pop()!;
        if (!visited.has(cur)) {
            yield [cur, depth];
            visited.add(cur);

            const depth1 = depth + 1;
            for (const nei of neighbours(cur)) {
                workList.push([nei, depth1]);
            }
        }
    }
}

/**
 * Minimum spanning tree, Kruskal's algorithm
 * @param vertices vertices
 * @param neighbours neighbours that forms an edge with a given vertex
 * @param weight the weight of each edge
 */
export function kruskalMST<T>(
    vertices: Set<T>,
    neighbours: (vertex: T) => IterableIterator<T>,
    weight: (u: T, v: T) => number,
): Graph<T> {
    /*
    https://en.wikipedia.org/wiki/Kruskal%27s_algorithm
    KRUSKAL(G):
    1 A = ∅
    2 foreach v ∈ G.V:
    3    MAKE-SET(v)
    4 foreach (u, v) in G.E ordered by weight(u, v), increasing:
    5    if FIND-SET(u) ≠ FIND-SET(v):
    6       A = A ∪ {(u, v)}
    7       UNION(u, v)
    8 return A
    */

    const sets = new UnionFind(vertices);
    const edges = Array

        // get all edges
        .from(vertices)
        .reduce((acc, u) => {
            acc.push(...Array
                .from(neighbours(u))
                .map((v) => [u, v] as [T, T]));
            return acc;
        }, new Array<[T, T]>())

        // sort by ascending order
        .sort(([u1, v1], [u2, v2]) => {
            return weight(u1, v1) - weight(u2, v2);
        });

    return edges.reduce((acc, [u, v]) => {
        if (!sets.isSameSet(u, v)) {
            Algo.getOrSet(acc, u, () => []).push(v);
            Algo.getOrSet(acc, v, () => []).push(u);
            sets.union(u, v);
        }
        return acc;
    }, new Map<T, T[]>());
}

/**
 * All-pair shortest pairs, Floyd-Warshall algorithm
 * @see https://en.wikipedia.org/wiki/Floyd%E2%80%93Warshall_algorithm
 */
export class FloydWarshall<T> {

    private nextMap: number[][];
    private verticesIdx: Map<T, number>;
    private vertices: T[];

    constructor(
        graph: Map<T, T[]>,
        weight: (u: T, v: T) => number,
    ) {
        /*
        let dist be a |V| * |V| array of minimum distances initialized to Infinity
        let next be a |V| * |V| array of vertex indices initialized to null

        procedure FloydWarshallWithPathReconstruction ()
        for each edge (u,v)
            dist[u][v] ← w(u,v)  // the weight of the edge (u,v)
            next[u][v] ← v
        for k from 1 to |V| // standard Floyd-Warshall implementation
            for i from 1 to |V|
                for j from 1 to |V|
                    if dist[i][j] > dist[i][k] + dist[k][j] then
                    dist[i][j] ← dist[i][k] + dist[k][j]
                    next[i][j] ← next[i][k]
        */
        console.assert(graph !== undefined);
        this.vertices = [...graph.keys()];
        this.verticesIdx = new Map(Array
            .from(this.vertices)
            .map((v, i) => [v, i] as [T, number]));

        const vSize = graph.size;

        const dist = new Array<number[]>(vSize);
        const next = this.nextMap = new Array<number[]>(vSize);

        for (let i = 0; i < vSize; i++) {
            dist[i] = new Array(vSize).fill(Infinity);
            next[i] = new Array(vSize);
        }
        for (const v of this.vertices) {
            const vIdx = this.verticesIdx.get(v)!;
            dist[vIdx][vIdx] = 0;
        }

        for (const [u, vs] of graph) {
            for (const v of vs) {
                const uIdx = this.verticesIdx.get(u)!;
                const vIdx = this.verticesIdx.get(v)!;
                dist[uIdx][vIdx] = weight(u, v);
                next[uIdx][vIdx] = vIdx;
            }
        }

        for (let k = 0; k < vSize; k++) {
            for (let i = 0; i < vSize; i++) {
                for (let j = 0; j < vSize; j++) {

                    const distIncludeK = dist[i][k] + dist[k][j];
                    if (dist[i][j] > distIncludeK) {
                        dist[i][j] = distIncludeK;
                        next[i][j] = next[i][k];
                    }
                }
            }
        }
    }

    public *path(u: T, v: T) {
        /*
            procedure Path(u, v)
            if next[u][v] = null then
                return []
            path = [u]
            while u ≠ v
                u ← next[u][v]
                path.append(u)
            return path
        */
        let uIdx = this.verticesIdx.get(u)!;
        const vIdx = this.verticesIdx.get(v)!;

        const nextMap = this.nextMap;
        if (nextMap[uIdx][vIdx] !== undefined) {
            yield u;
            while (uIdx !== vIdx) {
                uIdx = nextMap[uIdx][vIdx];
                yield this.vertices[uIdx];
            }
        }
    }

    public next(u: T, v: T) {
        const vIdx = this.verticesIdx.get(v)!;
        const uIdx = this.verticesIdx.get(u)!;
        const nextIdx = this.nextMap[uIdx][vIdx];
        if (nextIdx !== undefined) {
            return this.vertices[nextIdx];
        }
    }
}
