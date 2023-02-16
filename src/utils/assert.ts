import { UnreachableError } from "./UnreachableError";

export function assert(isInvariantSatisfied: boolean, msg = ""): void {
  if (!isInvariantSatisfied) {
    if (msg) {
      throw new UnreachableError(`invariant failed: ${msg}`);
    } else {
      throw new UnreachableError(`invariant failed`);
    }
  }
}
