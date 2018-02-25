import { Game } from "../game";
import * as Model from "../model/model";
import { MapDataKind } from "../model/model";
import * as View from "../view/view";

export class SelectView implements View.Observer {

    public static createSingle(game: Game, obj: Model.IMapData) {
        const createHelper = () => {
            switch (obj.kind) {
                case MapDataKind.Fleet:
                    return new View.FleetView(game, obj as Model.Fleet);
                case MapDataKind.Planet:
                    return new View.PlanetView(game, obj as Model.Planet);
                case MapDataKind.RouteSegment:
                    return new View.RouteSegmentView(game, obj as Model.IRouteSegment);
            }
        };
        game.addClosable(createHelper());
    }

    public readonly view = document.createElement("div");

    constructor(
        game: Game,
        objs: Model.IMapData[],
    ) {
        console.assert(objs.length > 0);

        const $title = View.$createTitlebar(game, this, `Open Which?`);

        const $contentPanel = View
            .$addContentPanelClass()
            .append(objs
                .map((obj) => {
                    const objLabel = $("<div>")
                        .addClass("selectLabel");
                    switch (obj.kind) {
                        case MapDataKind.Fleet:
                            objLabel
                                .text(`Trader ${(obj as Model.Fleet).id}`)
                                .css("color", "yellow");
                            break;
                        case MapDataKind.Planet:
                            objLabel
                                .text(`Planet ${(obj as Model.Planet).id}`);
                            break;
                        case MapDataKind.RouteSegment:
                            objLabel
                                .text(View.RouteSegmentView.routeTitleText(game, obj as Model.IRouteSegment))
                                .css("color", "darkcyan");
                            break;
                    }

                    return objLabel.click(() => this.clickSelect(game, obj));
                }));

        View
            .$addPanelClass(this)
            .append($title)
            .append($contentPanel)
            .mousedown((e) => {
                View.makeDraggable(this.view, e);
            })
            .click(() => {
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
