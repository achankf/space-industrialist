// IANAM (I am not a mathematician)

export function getQuantile(data: number[] | Float32Array, parts: number) {
    const copy = data.slice().sort();
    const percentile = copy.length / parts;

    return new Array<number>(parts)
        .fill(0)
        .map((_, i) => copy[Math.floor(i * percentile)]);
}

export function sum(...args: number[]) {
    return args
        .filter((val) => !Number.isNaN(val))
        .reduce((prev: number, cur: number) => prev + cur, 0);
}

export function average(...args: number[]) {
    return args.length === 0 ? NaN : sum(...args) / args.length;
}

export function equal2D([ax, ay]: [number, number], [bx, by]: [number, number]) {
    return ax === bx && ay === by;
}

export function compare2D([ax, ay]: [number, number], [bx, by]: [number, number]) {
    if (ax < bx) { return -1; }
    if (ay < by) { return 1; }
    return bx - by;
}

export function subtract2D([ax, ay]: [number, number], [bx, by]: [number, number]): [number, number] {
    return [ax - bx, ay - by];
}

export function sum2D([ax, ay]: [number, number], [bx, by]: [number, number]): [number, number] {
    return [ax + bx, ay + by];
}

export function norm2D([ax, ay]: [number, number]) {
    return Math.sqrt(ax * ax + ay * ay);
}

export function distance2D(a: [number, number], b: [number, number]) {
    return norm2D(subtract2D(a, b));
}

export function scalarMult2D([ax, ay]: [number, number], scalar: number): [number, number] {
    return [scalar * ax, scalar * ay];
}

export function project2D(a: [number, number], scalar = 1): [number, number] {
    const norm = norm2D(a);
    console.assert(norm !== 0, "caller make sure the given vector is not the origin");
    return scalarMult2D(a, scalar / norm);
}

export function determinant2D([ax, ay]: [number, number], [bx, by]: [number, number]) {
    return ax * by - bx * ay;
}

export const enum Intersection2D {
    None,
    Tangent,
    Intersection,
}

/**
 * Test whether a given line segment intersects a circle.
 * @param a a point in the line segment
 * @param b another point in the line segment
 * @param c the center of the target circle
 * @param r the target circle's radius
 * @see https://math.stackexchange.com/a/2035466
 * @see http://mathworld.wolfram.com/Circle-LineIntersection.html
 */
export function testLineCircleIntersect(a: [number, number], b: [number, number], c: [number, number], r: number) {
    // translate a and b by c, to simplify the problem to testing a line to a circle centered around the origin
    const ta = subtract2D(a, c);
    const tb = subtract2D(b, c);
    const dr = distance2D(a, b);
    const dr2 = dr * dr;
    const r2 = r * r;
    const disc = determinant2D(a, b);
    const disc2 = disc * disc;
    const discriminant = r2 * dr2 - disc2;

    if (discriminant < 0) {
        return Intersection2D.None;
    } else if (discriminant > 0) {
        return Intersection2D.Intersection;
    } else {
        return Intersection2D.Tangent;
    }
}
