import { Game, UpdateChannel } from "../game";
import * as Model from "../model/model";
import * as View from "./view";

export class RouteSegmentView implements View.Observer {

    public static routeTitleText(game: Game, route: Model.IRouteSegment) {
        const galaxy = game.galaxyProxy;
        const fromObj = galaxy.getPlanet(route.from) as Model.Planet;
        console.assert(fromObj !== undefined);
        const toObj = galaxy.getPlanet(route.to) as Model.Planet;
        console.assert(toObj !== undefined);

        if (fromObj.id < toObj.id) {
            return `Route (${fromObj.id} ⇆ ${toObj.id})`;
        }
        return `Route (${toObj.id} ⇆ ${fromObj.id})`;
    }

    public readonly view = document.createElement("div");

    private contents: View.Observer;

    private readonly lowPlanetId: number;
    private readonly highPlanetId: number;
    private readonly lowColony: Model.Colony;
    private readonly highColony: Model.Colony;

    constructor(
        game: Game,
        private readonly route: Model.IRouteSegment,
    ) {
        const galaxy = game.galaxyProxy;
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

        this.layout(game);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        this.contents.update(game, channels);
    }

    private layout(game: Game) {
        const galaxy = game.galaxyProxy;
        const $title = View.$createTitlebar(game, this, RouteSegmentView.routeTitleText(game, this.route));

        const $numTraders = $("<span>");
        const $fuelEff = $("<span>");

        const $general = $("<fieldset>")
            .append(
                $("<legend>").text("General"),
                $("<table>")
                    .append($("<tr>")
                        .attr("title", "This is the number of traders who trade in this trade lane.")
                        .append(
                            $("<td>").text("#Traders"),
                            $("<td>").append($numTraders),
                    ),
                        $("<tr>")
                            .attr("title", "Fuel efficiency determines how fast spaceships can travel due to extra fuel usage.")
                            .append(
                                $("<td>").text("Fuel Eff."),
                                $("<td>").append($fuelEff),
                        )),
        );

        // buttons for adding traders to route
        const $button1 = $("<button>")
            .text("+")
            .click(() => galaxy.addTradeFleet(this.lowColony, this.highColony));
        const $button2 = $("<button>")
            .text("+")
            .click(() => galaxy.addTradeFleet(this.highColony, this.lowColony));

        const $addRoutes = $("<fieldset>")
            .attr("title", "If you have a free trader, you can add the trader to this lane, transferring goods for you. If you don't have a free trader, you can either buy one from the top menu bar or can free one by retiring a trader from the trader screen.")
            .append(
                $("<legend>").text("Add Routes"),
                $("<table>")
                    .append(
                        $("<tr>")
                            .append(
                                $("<td>")
                                    .text(`${this.lowPlanetId} ⇆ ${this.highPlanetId}`),
                                $("<td>")
                                    .append($button1),
                        ),
                        $("<tr>")
                            .append(
                                $("<td>")
                                    .text(`${this.highPlanetId} ⇆ ${this.lowPlanetId}`),
                                $("<td>")
                                    .append($button2),
                        )),
        );

        const $contentPanel = View
            .$addContentPanelClass()
            .append($general, $addRoutes);

        $(this.view).empty();
        View
            .$addPanelClass(this)
            .append($title, $contentPanel)
            .mousedown((e) => {
                View.makeDraggable(this.view, e);
            })
            .click(() => {
                View.bringToFront(this.view);
            });
        $(document.body).append(this.view);

        this.contents = {
            update: () => {
                const numTraders = galaxy.getNumUsedTraders(this.lowColony, this.highColony);
                $numTraders.text(numTraders);
                const routeEffPercent = Math.round(galaxy.getRouteFuelEff(this.lowColony, this.highColony) * 100);
                $fuelEff.text(`${routeEffPercent}%`);

                const isNoAvailTraders = galaxy.getNumUnusedTraders() === 0;
                $button1.prop("disabled", isNoAvailTraders);
                $button2.prop("disabled", isNoAvailTraders);
            },
        };
    }
}
