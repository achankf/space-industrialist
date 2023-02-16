import React, { useContext } from "react";

import { GameContext } from "../../../contexts/GameContext";
import { Colony } from "../../../model/colony";
import { EncourageGrowth } from "./EncourageGrowth";
import { ExpandButton } from "./ExpandButton";
import { GrowthRate } from "./GrowthRate";
import { Population } from "./Population";
import { PowerConsumer } from "./PowerConsumer";
import { PowerProducer } from "./PowerProducer";

interface ColonyDetailsProps {
  colony: Colony;
  expandPowerPlant: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export const ColonyDetails: React.FC<ColonyDetailsProps> = ({
  colony,
  expandPowerPlant,
}) => {
  const { game } = useContext(GameContext);
  const galaxy = game.getReader();
  const { industrialUsage, traderUsage, civUsage, totalUsage } =
    galaxy.getTotalPowerUsage(colony);

  const population = colony.getPopulation();
  const maxPop = colony.getMaxPop();

  const growthRate = galaxy.growthRate(colony);

  const powerPlanetLevel = colony.getPowerPlanetLevel();
  const fuelDemand = colony.getFuelDemand();
  const powerOutput = colony.getPowerOutput();
  const energyPrice = galaxy.getEnergyPrice(colony);

  const totalOutput = colony.getPowerOutput();
  const powerUsageEff = galaxy.getPowerUsageEff(colony) * 100;

  const canExpandPowerPlant = galaxy.canExpandPowerPlant(colony);

  return (
    <>
      <Population num={population} max={maxPop} />
      <GrowthRate growthRate={growthRate} />
      <EncourageGrowth colony={colony} />
      <tr>
        <td
          colSpan={2}
          title="Citizens and industrial complexes need power to be run efficiently. Ideally, you want to keep power surplus, so that the local colony and your industrial complexes can run at optimal efficiency."
        >
          <span>
            Usage: {totalUsage}/{totalOutput} (Eff.: {powerUsageEff.toFixed(2)}
            %)
          </span>
          <ExpandButton
            onClick={expandPowerPlant}
            disabled={!canExpandPowerPlant}
          />
          <PowerProducer
            powerPlanetLevel={powerPlanetLevel}
            fuelDemand={fuelDemand}
            powerOutput={powerOutput}
            energyPrice={energyPrice}
          />
          <PowerConsumer
            industrialUsage={industrialUsage}
            traderUsage={traderUsage}
            civUsage={civUsage}
          />
        </td>
      </tr>
    </>
  );
};
