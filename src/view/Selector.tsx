import React, { useContext } from "react";
import styled from "styled-components";
import assert from "../utils/assert";
import { GameContext } from "../contexts/GameContext";
import { IMapData, IRouteSegment, MapDataKind } from "../model";
import { Fleet as FleetModel } from "../model/fleet";
import { Planet as PlanetModel } from "../model/planet";
import Window from "../components/Window";
import ContentPanel from "../components/ContentPanel";
import TitleBar from "../components/TitleBar";
import { ViewContext } from "../contexts/ViewContext";
import Bug from "../utils/UnreachableError";
import { BaseViewProps, ViewKind } from "./constants/view";
import { routeString } from "./Route";

export interface BaseSelectorProps {
  objs: IMapData[];
}

type SelectorProps = BaseSelectorProps & BaseViewProps;

const Selector: React.FC<SelectorProps> = ({ viewId, objs }) => {
  assert(objs.length > 0);

  const { game } = useContext(GameContext);
  const { setCurrentView } = useContext(ViewContext);

  const allLabels = objs.map((obj) => {
    let uiData: { label: string; color: string; click: () => void };

    switch (obj.kind) {
      case MapDataKind.Fleet:
        {
          const fleet = obj as FleetModel;
          uiData = {
            label: `Trader ${fleet.id}`,
            color: "yellow",
            click() {
              setCurrentView({ kind: ViewKind.Fleet, fleet });
            },
          };
        }
        break;
      case MapDataKind.Planet:
        {
          const planet = obj as PlanetModel;
          uiData = {
            label: `Planet ${planet.id}`,
            color: "green",
            click() {
              setCurrentView({ kind: ViewKind.Planet, planet });
            },
          };
        }
        break;
      case MapDataKind.RouteSegment:
        {
          const route = obj as IRouteSegment;
          uiData = {
            label: `${routeString(game, route)}`,
            color: "darkcyan",
            click() {
              setCurrentView({ kind: ViewKind.Route, route });
            },
          };
        }
        break;
      default:
        throw new Bug();
    }

    const { label, color, click } = uiData;
    return (
      <SelectLabel key={label} color={color} onClick={click}>
        {label}
      </SelectLabel>
    );
  });

  return (
    <Window>
      <TitleBar viewId={viewId} title="Which One?" />
      <ContentPanel>{allLabels}</ContentPanel>
    </Window>
  );
};

const SelectLabel = styled.div.attrs(() => ({ className: "button" }))`
  color: ${(props) => props.color};
`;

export default Selector;
