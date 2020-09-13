import * as React from "react";
import { useState } from "react";
import { Fleet as FleetModel } from "../../model/fleet";
import ContentPanel from "../../components/ContentPanel";
import TitleBar from "../../components/TitleBar";
import Window from "../../components/Window";
import { BaseViewProps } from "../constants/view";
import { SubViewKind } from "./constants";
import SubView from "./SubView";

export interface BaseFleetProps {
  fleet: FleetModel;
}

type FleetProps = BaseFleetProps & BaseViewProps;

const Fleet: React.FC<FleetProps> = ({ viewId, fleet }) => {
  const [subViewKind, setSubViewKind] = useState(SubViewKind.Route);

  return (
    <Window>
      <TitleBar viewId={viewId} title={`Trader ${fleet.id}`} />
      <ContentPanel>
        <nav className="tabs">
          <div onClick={() => setSubViewKind(SubViewKind.Route)}>Route</div>
          <div onClick={() => setSubViewKind(SubViewKind.Cargo)}>Cargo</div>
        </nav>
        <SubView viewId={viewId} kind={subViewKind} fleet={fleet} />
      </ContentPanel>
    </Window>
  );
};

export default Fleet;
