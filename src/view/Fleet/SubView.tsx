import React from "react";

import { Fleet } from "../../model/fleet";
import { UnreachableError } from "../../utils/UnreachableError";
import { Cargo } from "./Cargo";
import { SubViewKind } from "./constants";
import { Route } from "./Route";

interface SubViewProps {
  viewId: symbol;
  kind: SubViewKind;
  fleet: Fleet;
}

export const SubView: React.FC<SubViewProps> = ({ viewId, kind, fleet }) => {
  switch (kind) {
    case SubViewKind.Route:
      return <Route viewId={viewId} fleet={fleet} />;
    case SubViewKind.Cargo:
      return <Cargo fleet={fleet} />;
    default:
      throw new UnreachableError();
  }
};
