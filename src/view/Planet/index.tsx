import React, { useState } from "react";

import ContentPanel from "../../components/ContentPanel";
import Nav, { NavButtonProps } from "../../components/Nav";
import TitleBar from "../../components/TitleBar";
import Window from "../../components/Window";
import { Planet } from "../../model/planet";
import { BaseViewProps } from "../constants/view";
import { SubViewKind } from "./constants";
import SubView from "./SubView";

export interface BasePlanetProps {
  planet: Planet;
}

type PlanetProps = BasePlanetProps & BaseViewProps;

const PlanetView: React.FC<PlanetProps> = ({ viewId, planet }) => {
  const [subVIewKind, setSubViewKind] = useState(SubViewKind.Info);
  const colony = planet.tryGetColony();

  const navButtons: NavButtonProps[] = [
    { label: "Planet", onClick: () => setSubViewKind(SubViewKind.Info) },
    { label: "Market", onClick: () => setSubViewKind(SubViewKind.Market) },
    { label: "Industry", onClick: () => setSubViewKind(SubViewKind.Industry) },
  ];

  return (
    <Window>
      <TitleBar viewId={viewId} title={`Planet ${planet.id}`} />
      {colony ? <Nav buttons={navButtons} /> : null}
      <ContentPanel>
        <SubView kind={subVIewKind} planet={planet} colony={colony} />
      </ContentPanel>
    </Window>
  );
};

export default PlanetView;
