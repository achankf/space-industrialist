import React, { useState } from "react";
import { Planet } from "../../model/planet";
import ContentPanel from "../../components/ContentPanel";
import TitleBar from "../../components/TitleBar";
import Window from "../../components/Window";
import { BaseViewProps } from "../constants/view";
import SubView from "./SubView";
import { SubViewKind } from "./constants";

export interface BasePlanetProps {
  planet: Planet;
}

type PlanetProps = BasePlanetProps & BaseViewProps;

const PlanetView: React.FC<PlanetProps> = ({ viewId, planet }) => {
  const [subVIewKind, setSubViewKind] = useState(SubViewKind.Info);
  const colony = planet.tryGetColony();

  return (
    <Window>
      <TitleBar viewId={viewId} title={`Planet ${planet.id}`} />
      {colony ? (
        <nav className="tabs">
          <div onClick={() => setSubViewKind(SubViewKind.Info)}>Planet</div>
          <div onClick={() => setSubViewKind(SubViewKind.Market)}>Market</div>
          <div onClick={() => setSubViewKind(SubViewKind.Industry)}>
            Industry
          </div>
        </nav>
      ) : undefined}
      <ContentPanel>
        <SubView kind={subVIewKind} planet={planet} colony={colony} />
      </ContentPanel>
    </Window>
  );
};

export default PlanetView;
