import * as React from "react";
import { Game } from "../../../game";
import * as Model from "../../../model";
import ColonizeButton from "./ColonizeButton";
import ColonyDetails from "./ColonyDetails";
import Coor from "./Coor";
import Resource from "./Resource";

interface IInfoOwnProps {
    game: Game;
    planet: Model.Planet;
}

type InfoProps = IInfoOwnProps;

export default class Info extends React.Component<InfoProps> {

    public render() {

        const game = this.props.game;
        const planet = this.props.planet;
        const galaxy = game.getReader();
        const resource = planet.resource;
        const [x, y] = galaxy.getCoor(planet);

        const colony = planet.getColony();

        return <table>
            <tbody>
                <Resource resource={resource} />
                <Coor x={x} y={y} />
                {colony !== undefined ?
                    <ColonyDetails
                        colony={colony}
                        game={game}
                        expandPowerPlant={this.expandPowerPlant}
                    /> :
                    <ColonizeButton colonize={this.colonize} game={game} />}
            </tbody>
        </table>;
    }

    private colonize = () => {
        const galaxy = this.props.game.getWriter();

        const reader = this.props.game.getReader();
        const numColonies = reader.getNumColonizedPlanets();

        let initialPop = 1;
        if (numColonies === 0) {
            initialPop = 10; // first colony has bonus population to kick start the game
        }
        galaxy.colonizePlanet(this.props.planet, initialPop);
    }

    private expandPowerPlant = (e: React.MouseEvent<HTMLButtonElement>) => {

        const galaxy = this.props.game.getWriter();
        const planet = this.props.planet;

        console.assert(planet.isColonized()); // can't have a power plant on a uncolonized planet

        const colony = planet.getColony()!;

        const isOk = e.ctrlKey || confirm(`Are you sure to invest in power planet at planet ${planet.id}? This action costs $${Model.POWER_PLANT_COST}. (press ctrl while clicking the button suppresses this message)`);
        if (isOk) {
            galaxy.expandPowerPlant(colony);
            galaxy.withdraw(Model.POWER_PLANT_COST);
        }
    }
}
