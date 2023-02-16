import React from "react";

import { Colony } from "../../model/colony";
import { Planet } from "../../model/planet";
import { UnreachableError } from "../../utils/UnreachableError";
import { SubViewKind } from "./constants";
import { Industry } from "./Industry";
import { Info } from "./Info";
import { Market } from "./Market";

export const SubView: React.FC<{
  kind: SubViewKind;
  planet: Planet;
  colony?: Colony;
}> = ({ kind, planet, colony }) => {
  if (!colony) {
    return <Info planet={planet} />;
  }

  switch (kind) {
    case SubViewKind.Market:
      return <Market colony={colony} />;
    case SubViewKind.Info:
      return <Info planet={planet} />;
    case SubViewKind.Industry:
      return <Industry colony={colony} />;
    default:
      throw new UnreachableError();
  }
};
