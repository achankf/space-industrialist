import Bug from "./UnreachableError";

export default function (isInvariantSatisfied: boolean, msg = ""): void {
  if (!isInvariantSatisfied) {
    if (msg) {
      throw new Bug(`invariant failed: ${msg}`);
    } else {
      throw new Bug(`invariant failed`);
    }
  }
}
