import { Game, UpdateChannel } from "../game.js";
import * as Model from "../model/model.js";
import { MapDataKind } from "../model/model.js";
import * as View from "../view/view.js";

export class SelectView implements View.Observer {

    public static createSingle(game: Game, obj: Model.IMapData) {
        const createHelper = () => {
            switch (obj.kind) {
                case MapDataKind.Fleet:
                    return new View.FleetView(game, obj as Model.Fleet);
                case MapDataKind.Shipyard:
                    {
                        const shipyard = obj as Model.Shipyard;
                        const view = new View.PlanetView(game, shipyard.getLink());
                        view.setShipyardPanel(game);
                        return view;
                    }
                case MapDataKind.Planet:
                    return new View.PlanetView(game, obj as Model.Planet);
                default:
                    throw new Error("not handled");
            }
        };
        game.addClosable(createHelper());
    }

    public readonly view = document.createElement("div");

    constructor(
        game: Game,
        objs: Set<Model.IMapData>,
    ) {
        console.assert(objs.size > 0);

        const title = View.$createTitlebar(game, this, `Open Which?`);

        const contentPanel = View.$createContentPanel();

        for (const obj of objs) {
            let text;
            switch (obj.kind) {
                case MapDataKind.Fleet:
                    text = "Fleet";
                    break;
                case MapDataKind.Shipyard:
                    text = "Shipyard";
                    break;
                case MapDataKind.Planet:
                    text = "Planet";
                    break;
                default:
                    throw new Error("not handled");
            }

            $("<div>")
                .text(text)
                .click(() => this.clickSelect(game, obj))
                .appendTo(contentPanel);
        }

        View
            .$addPanelClass(this)
            .append(title)
            .append(contentPanel)
            .mousedown((e) => {
                View.makeDraggable(this.view, e);
            })
            .click((e) => {
                View.bringToFront(this.view);
            })
            .appendTo(document.body);
    }

    public update() {
        //
    }

    private clickSelect(game: Game, obj: Model.IMapData) {
        SelectView.createSingle(game, obj);
        game.close(this);
    }
}
