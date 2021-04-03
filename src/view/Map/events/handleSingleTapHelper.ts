import { Vec2D } from "myalgo-ts";

import { ViewContextType } from "../../../contexts/ViewContext";
import { GalaxyReadProxy } from "../../../game";
import { IRouteSegment, MapDataKind } from "../../../model";
import { Fleet as FleetModel } from "../../../model/fleet";
import { Planet as PlanetModel } from "../../../model/planet";
import { ViewKind } from "../../constants/view";
import { RADIUS } from "../constants";
import CoorCalculator from "../CoorCalculator";
import { MapUIState } from "../reducer/state";

export default function (
  galaxy: GalaxyReadProxy,
  state: MapUIState,
  setCurrentView: ViewContextType["setCurrentView"],
  e: HammerInput
): void {
  const coorCalculator = new CoorCalculator(state);
  const bb = e.target.getBoundingClientRect();
  const coor: Vec2D = [e.center.x - bb.left, e.center.y - bb.top];
  const gameCoor = coorCalculator.toGameCoor(coor);

  const nearbyObjs = galaxy.searchNearbyObjs(gameCoor, RADIUS).toArray();
  switch (nearbyObjs.length) {
    case 0:
      break;
    case 1: {
      const obj = nearbyObjs[0];
      switch (obj.kind) {
        case MapDataKind.Fleet:
          setCurrentView({ kind: ViewKind.Fleet, fleet: obj as FleetModel });
          break;
        case MapDataKind.Planet:
          setCurrentView({
            kind: ViewKind.Planet,
            planet: obj as PlanetModel,
          });
          break;
        case MapDataKind.RouteSegment:
          setCurrentView({
            kind: ViewKind.Route,
            route: obj as IRouteSegment,
          });
          break;
      }
      break;
    }
    default: {
      setCurrentView({ kind: ViewKind.Selector, objs: nearbyObjs });
      break;
    }
  }
}
