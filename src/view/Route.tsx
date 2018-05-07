import * as React from "react";
import { Game } from "../game";
import * as Model from "../model";
import ContentPanel from "./ContentPanel";
import TitleBar from "./TitleBar";
import Window from "./Window";

interface IRouteOwnProps {
    game: Game;
    route: Model.IRouteSegment;
}

function arrow(left: number, right: number) {
    return `${left} ⇆ ${right}`;
}

export default class Route extends React.Component<IRouteOwnProps> {

    public readonly view = document.createElement("div");

    private readonly lowPlanetId: number;
    private readonly highPlanetId: number;
    private readonly lowColony: Model.Colony;
    private readonly highColony: Model.Colony;

    constructor(props: IRouteOwnProps) {
        super(props);

        const game = this.props.game;
        const route = this.props.route;
        const galaxy = game.getReader();

        const fromObj = galaxy.getPlanet(route.from) as Model.Planet;
        console.assert(fromObj !== undefined);
        console.assert(fromObj.isColonized());
        const toObj = galaxy.getPlanet(route.to) as Model.Planet;
        console.assert(toObj !== undefined);
        console.assert(toObj.isColonized());

        if (fromObj.id < toObj.id) {
            this.lowPlanetId = fromObj.id;
            this.highPlanetId = toObj.id;
            this.lowColony = fromObj.getColony()!;
            this.highColony = toObj.getColony()!;
        } else {
            this.lowPlanetId = toObj.id;
            this.highPlanetId = fromObj.id;
            this.lowColony = toObj.getColony()!;
            this.highColony = fromObj.getColony()!;
        }
    }

    public render() {
        const game = this.props.game;
        const galaxy = game.getReader();
        const route = this.props.route;

        const numTraders = galaxy.getNumUsedTraders(this.lowColony, this.highColony);
        const routeEffPercent = Math.round(galaxy.getRouteFuelEff(this.lowColony, this.highColony) * 100);
        const isNoAvailTraders = galaxy.getNumUnusedTraders() === 0;

        return <Window>
            <TitleBar title={routeString(game, route)} />
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
                                <td>{`${arrow(this.lowPlanetId, this.highPlanetId)}`}</td>
                                <td>
                                    <button
                                        onClick={this.addFleetLowToHigh}
                                        disabled={isNoAvailTraders}
                                    >+</button>
                                </td>
                            </tr>
                            <tr>
                                <td>{`${arrow(this.highPlanetId, this.lowPlanetId)}`}</td>
                                <td>
                                    <button
                                        onClick={this.addFleetHighToLow}
                                        disabled={isNoAvailTraders}
                                    >+</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </fieldset>
            </ContentPanel>
        </Window>;
    }

    private addFleetLowToHigh = () => {
        const game = this.props.game;
        const galaxy = game.getWriter();
        galaxy.addTradeFleet(this.lowColony, this.highColony);
    }

    private addFleetHighToLow = () => {
        const game = this.props.game;
        const galaxy = game.getWriter();
        galaxy.addTradeFleet(this.highColony, this.lowColony);
    }
}

export function routeString(game: Game, route: Model.IRouteSegment) {
    const galaxy = game.getReader();
    const fromObj = galaxy.getPlanet(route.from) as Model.Planet;
    console.assert(fromObj !== undefined);
    const toObj = galaxy.getPlanet(route.to) as Model.Planet;
    console.assert(toObj !== undefined);

    if (fromObj.id < toObj.id) {
        return `Route (${arrow(fromObj.id, toObj.id)})`;
    }
    return `Route (${arrow(toObj.id, fromObj.id)})`;
}
