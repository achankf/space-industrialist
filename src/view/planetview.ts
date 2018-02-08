import * as Algo from "../algorithm/algorithm";
import { Game, UpdateChannel } from "../game.js";
import { DrawTable } from "../html.js";
import * as Model from "../model/model.js";
import { IndustryPanel } from "./panel/industry.js";
import { MarketPanel } from "./panel/market.js";
import { PlanetInfoPanel } from "./panel/planetinfo.js";
import { ShipyardPanel } from "./panel/shipyard.js";
import * as View from "./view.js";

export class PlanetView implements View.Observer {

    public readonly view = document.createElement("div");

    private contents: View.Observer | undefined;
    private readonly theContents = document.createElement("div");
    private isPrevColonized = this.planet.isColonized();

    constructor(
        game: Game,
        private readonly planet: Model.Planet,
    ) {
        this.layout(game);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {

        if (!this.isPrevColonized && this.planet.isColonized()) {
            this.isPrevColonized = true;
            this.layout(game);
        } else {
            if (this.contents !== undefined) {
                this.contents.update(game, channels);
            }
        }
    }

    public setMarketPanel(game: Game) {
        const galaxy = game.galaxy;
        const market = galaxy.getMarket(this.planet);
        const panel = new MarketPanel(game, this.theContents, market);
        this.contents = panel;
        panel.update(game, Algo.union(UpdateChannel.DataChange, UpdateChannel.DataTurnChange));
    }

    public setIndustryPanel(game: Game) {
        const panel = new IndustryPanel(game, this.theContents, this.planet.getColony()!);
        this.contents = panel;
        panel.update(game, Algo.union(UpdateChannel.DataChange, UpdateChannel.DataTurnChange));
    }

    public setInfoPanel(game: Game) {
        const panel = new PlanetInfoPanel(game, this.theContents, this.planet);
        this.contents = panel;
        panel.update(game, Algo.union(UpdateChannel.DataChange, UpdateChannel.DataTurnChange));
    }

    public setShipyardPanel(game: Game) {
        const panel = new ShipyardPanel(game, this.theContents);
        this.contents = panel;
        panel.update(game, Algo.union(UpdateChannel.DataChange, UpdateChannel.DataTurnChange));
    }

    private layout(game: Game) {
        const galaxy = game.galaxy;
        const planet = this.planet;
        const title = View.$createTitlebar(game, this, `Planet ${planet.id}`);
        const contentPanel = View.$createContentPanel();

        $(this.theContents).appendTo(contentPanel);

        const list = [title];

        const tabs = $("<nav>")
            .addClass("tabs");

        if (this.planet.isColonized()) {
            $("<div>")
                .text("Info")
                .click(() => this.setInfoPanel(game))
                .appendTo(tabs);

            $("<div>")
                .text("Market")
                .click(() => this.setMarketPanel(game))
                .appendTo(tabs);

            $("<div>")
                .text("Industry")
                .click(() => this.setIndustryPanel(game))
                .appendTo(tabs);
        }

        const satellite = galaxy.getSatellite(planet);
        if (satellite) {
            $("<div>")
                .text("Shipyard")
                .click(() => this.setShipyardPanel(game))
                .appendTo(tabs);
        }

        if (tabs.children().length > 0) {
            list.push(tabs);
        }

        list.push(contentPanel);

        $(this.view).empty();
        View
            .$addPanelClass(this)
            .append(...list)
            .mousedown((e) => {
                View.makeDraggable(this.view, e);
            })
            .click((e) => {
                View.bringToFront(this.view);
            });

        this.setInfoPanel(game);
        $(document.body).append(this.view);
    }
}
