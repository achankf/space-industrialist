import { Game, UpdateChannel } from "../../game.js";
import * as Model from "../../model/model.js";
import * as View from "../view.js";

export class PlanetInfoPanel implements View.Observer {

    private observables = new Set<View.Observer>();

    constructor(
        private readonly game: Game,
        private readonly view: HTMLElement,
        private readonly planet: Model.Planet,
    ) {
        this.observables.clear();
        const galaxy = game.galaxy;
        const resource = planet.resource;
        const [x, y] = galaxy.getCoor(planet);

        const isColonized = planet.isColonized();

        const list = [
            $("<div>").text(`Resource: ${Model.Product[resource]}`),
            $("<div>").text(`Coor: (${x.toFixed(2)},${y.toFixed(2)})`),
        ];

        const planetPopLabel = $("<div>");

        if (isColonized) {
            list.push(planetPopLabel);
        } else {
            // add the colonize button
            const button = $("<button>")
                .text("Colonize");

            list.push(button
                .click((e) => {
                    galaxy.colonizePlanet(planet, 1);
                    button.remove();
                    this.game.queueUpdate(UpdateChannel.MapChange);
                }));
        }

        $(this.view)
            .empty()
            .append(...list);

        this.observables.add({
            update: () => {
                const colony = planet.getColony();

                if (colony) {
                    planetPopLabel.text(`Population: ${colony.getPopulation().toFixed(2)}`);
                }
            },
        });
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        for (const observable of this.observables) {
            observable.update(game, channels);
        }
    }
}
