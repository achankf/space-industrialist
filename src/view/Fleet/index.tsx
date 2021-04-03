import * as React from "react";
import { useState } from "react";

import ContentPanel from "../../components/ContentPanel";
import Nav, { NavButtonProps } from "../../components/Nav";
import TitleBar from "../../components/TitleBar";
import Window from "../../components/Window";
import { Fleet as FleetModel } from "../../model/fleet";
import { BaseViewProps } from "../constants/view";
import { SubViewKind } from "./constants";
import SubView from "./SubView";

export interface BaseFleetProps {
  fleet: FleetModel;
}

type FleetProps = BaseFleetProps & BaseViewProps;

const Fleet: React.FC<FleetProps> = ({ viewId, fleet }) => {
  const [subViewKind, setSubViewKind] = useState(SubViewKind.Route);

  const navButtons: NavButtonProps[] = [
    { label: "Route", onClick: () => setSubViewKind(SubViewKind.Route) },
    { label: "Cargo", onClick: () => setSubViewKind(SubViewKind.Cargo) },
  ];

  return (
    <Window>
      <TitleBar viewId={viewId} title={`Trader ${fleet.id}`} />
      <Nav buttons={navButtons} />
      <ContentPanel>
        <SubView viewId={viewId} kind={subViewKind} fleet={fleet} />
      </ContentPanel>
    </Window>
  );
};

export default Fleet;
