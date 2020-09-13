import React, { useContext } from "react";
import { GameContext } from "../contexts/GameContext";
import { Game } from "../game";
import { IRouteSegment as RouteSegment } from "../model";
import Window from "../components/Window";
import ContentPanel from "../components/ContentPanel";
import TitleBar from "../components/TitleBar";
import assert from "../utils/assert";
import { BaseViewProps } from "./constants/view";

export function routeString(game: Game, route: RouteSegment): string {
  const galaxy = game.getReader();
  const from = galaxy.getPlanet(route.from);
  const to = galaxy.getPlanet(route.to);

  if (from.id < to.id) {
    return `Route (${arrow(from.id, to.id)})`;
  }
  return `Route (${arrow(to.id, from.id)})`;
}

export interface BaseRouteProps {
  route: RouteSegment;
}

type RouteProps = BaseRouteProps & BaseViewProps;

function arrow(left: number, right: number) {
  return `${left} ⇆ ${right}`;
}

const Route: React.FC<RouteProps> = ({ viewId, route }) => {
  const { game } = useContext(GameContext);
  const galaxyReader = game.getReader();
  const galaxyWriter = game.getWriter();

  const from = galaxyReader.getPlanet(route.from);
  assert(from.isColonized());
  const to = galaxyReader.getPlanet(route.to);
  assert(to.isColonized());

  const { low, high } =
    from.id < to.id ? { low: from, high: to } : { low: to, high: from };
  const lowPlanetId = low.id;
  const highPlanetId = high.id;
  const lowColony = low.getColony();
  const highColony = high.getColony();

  const numTraders = galaxyReader.getNumUsedTraders(lowColony, highColony);
  const routeEffPercent = Math.round(
    galaxyReader.getRouteFuelEff(lowColony, highColony) * 100
  );
  const isNoAvailTraders = galaxyReader.getNumUnusedTraders() === 0;

  return (
    <Window>
      <TitleBar viewId={viewId} title={routeString(game, route)} />
      <ContentPanel>
        <fieldset>
          <legend>General</legend>
          <table>
            <tbody>
              <tr title="This is the number of traders who trade in this trade lane.">
                <td>#Traders</td>
                <td>{numTraders}</td>
              </tr>
              <tr title="Fuel efficiency determines how fast spaceships can travel due to extra fuel usage.">
                <td>Fuel Eff.</td>
                <td>{`${routeEffPercent}%`}</td>
              </tr>
            </tbody>
          </table>
        </fieldset>
        <fieldset title="If you have a free trader, you can add the trader to this lane, transferring goods for you. If you don't have a free trader, you can either buy one from the top menu bar or can free one by retiring a trader from the trader screen.">
          <legend>Add Routes</legend>
          <table>
            <tbody>
              <tr>
                <td>{arrow(lowPlanetId, highPlanetId)}</td>
                <td>
                  <button
                    onClick={() =>
                      galaxyWriter.addTradeFleet(lowColony, highColony)
                    }
                    disabled={isNoAvailTraders}
                  >
                    +
                  </button>
                </td>
              </tr>
              <tr>
                <td>{arrow(highPlanetId, lowPlanetId)}</td>
                <td>
                  <button
                    onClick={() =>
                      galaxyWriter.addTradeFleet(highColony, lowColony)
                    }
                    disabled={isNoAvailTraders}
                  >
                    +
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </fieldset>
      </ContentPanel>
    </Window>
  );
};

export default Route;
