import { Game, UpdateChannel } from "../../game.js";
import * as Model from "../../model/model.js";
import * as View from "../view.js";

export class ShipyardPanel implements View.Observer {

    private observables: View.Observer[] = [];

    constructor(
        private readonly game: Game,
        private readonly view: HTMLElement,
    ) {
        const list = [
            $("<div>").text(`shipyard`),
        ];

        $(this.view)
            .empty()
            .append(...list);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        for (const observable of this.observables) {
            observable.update(game, channels);
        }
    }
}
