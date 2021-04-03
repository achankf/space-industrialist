import React, { useContext } from "react";

import { GameContext } from "../../../contexts/GameContext";
import { POWER_PLANT_COST } from "../../../model";
import { Planet } from "../../../model/planet";
import assert from "../../../utils/assert";
import ColonizeButton from "./ColonizeButton";
import ColonyDetails from "./ColonyDetails";
import Coor from "./Coor";
import Resource from "./Resource";

interface InfoProps {
  planet: Planet;
}

const Info: React.FC<InfoProps> = ({ planet }) => {
  const { game } = useContext(GameContext);
  const galaxy = game.getReader();
  const resource = planet.resource;
  const [x, y] = galaxy.getCoor(planet);

  const colony = planet.tryGetColony();

  function colonize() {
    const galaxy = game.getWriter();
    const reader = game.getReader();
    const numColonies = reader.getNumColonizedPlanets();

    let initialPop = 1;
    if (numColonies === 0) {
      initialPop = 10; // first colony has bonus population to kick start the game
    }
    galaxy.colonizePlanet(planet, initialPop);
  }

  function expandPowerPlant(e: React.MouseEvent<HTMLButtonElement>) {
    const galaxy = game.getWriter();

    assert(planet.isColonized()); // can't have a power plant on a uncolonized planet

    const colony = planet.getColony();

    const isOk =
      e.ctrlKey ||
      window.confirm(
        `Are you sure to invest in power planet at planet ${planet.id}? This action costs $${POWER_PLANT_COST}. (press ctrl while clicking the button suppresses this message)`
      );
    if (isOk) {
      galaxy.expandPowerPlant(colony);
      galaxy.withdraw(POWER_PLANT_COST);
    }
  }

  return (
    <table>
      <tbody>
        <Resource resource={resource} />
        <Coor x={x} y={y} />
        {colony ? (
          <ColonyDetails colony={colony} expandPowerPlant={expandPowerPlant} />
        ) : (
          <ColonizeButton colonize={colonize} />
        )}
      </tbody>
    </table>
  );
};

export default Info;
