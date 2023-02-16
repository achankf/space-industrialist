import React, { useContext } from "react";

import { ViewContext } from "../contexts/ViewContext";
import { UnreachableError } from "../utils/UnreachableError";
import { ViewKind } from "./constants/view";
import { Fleet } from "./Fleet";
import { ImportExport } from "./ImportExport";
import { PlanetView } from "./Planet";
import { Route } from "./Route";
import { Selector } from "./Selector";
import { Tutorial } from "./Tutorial";

export const Views: React.FC = () => {
  const { currentView: props } = useContext(ViewContext);
  if (!props) {
    return null;
  }
  const { viewId } = props;
  switch (props.kind) {
    case ViewKind.ImportExport:
      return <ImportExport viewId={viewId} />;
    case ViewKind.Fleet: {
      const { fleet } = props;
      return <Fleet viewId={viewId} fleet={fleet} />;
    }
    case ViewKind.Planet: {
      const { planet } = props;
      return <PlanetView viewId={viewId} planet={planet} />;
    }
    case ViewKind.Route: {
      const { route } = props;
      return <Route viewId={viewId} route={route} />;
    }
    case ViewKind.Selector: {
      const { objs } = props;
      return <Selector viewId={viewId} objs={objs} />;
    }
    case ViewKind.Tutorial:
      return <Tutorial viewId={viewId} />;
    default:
      throw new UnreachableError();
  }
};
