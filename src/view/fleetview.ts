import * as Immutable from "immutable";
import { Game, UpdateChannel } from "../game";
import { DrawTable } from "../html";
import * as Model from "../model/model";
import * as View from "./view";

export class FleetView implements View.Observer {

    public readonly view = document.createElement("div");

    private contents: View.Observer;
    private readonly theContents = document.createElement("div");

    constructor(
        game: Game,
        private fleet: Model.Fleet,
    ) {
        const $title = View.$createTitlebar(game, this, `Trader ${fleet.id}`);
        const $contentPanel = View.$addContentPanelClass(this.theContents);

        const $tabs = $("<nav>")
            .addClass("tabs")
            .append(
                $("<div>")
                    .text("Route")
                    .click(() => this.setRoutePanel(game)),
                $("<div>")
                    .text("Cargo")
                    .click(() => this.setCargoPanel()));

        this.setRoutePanel(game);

        View
            .$addPanelClass(this)
            .append($title, $tabs, $contentPanel)
            .mousedown((e) => {
                View.makeDraggable(this.view, e);
            })
            .click(() => {
                View.bringToFront(this.view);
            })
            .appendTo(document.body);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {

        if (!game.galaxy.exists(this.fleet)) {
            game.close(this);
        }

        this.contents.update(game, channels);
    }

    private setRoutePanel(game: Game) {
        this.contents = new RoutePanel(game, this.theContents, this.fleet);
    }

    private setCargoPanel() {
        this.contents = new CargoPanel(this.theContents, this.fleet);
    }
}

class RoutePanel implements View.Observer {

    private tableDrawer: DrawTable<Model.Colony>;
    private observer: View.Observer;

    constructor(
        readonly game: Game,
        readonly view: HTMLElement,
        private readonly fleet: Model.Fleet,
    ) {
        const galaxy = game.galaxy;
        this.tableDrawer = new DrawTable<Model.Colony>([
            ["Place", undefined],
            ["Dest", undefined],
        ], () => this.update(game, new Set([UpdateChannel.DataChange])));

        const $speedLabel = $("<span>");
        const $speed = $("<div>")
            .text("Speed: ")
            .attr("title", "The speed indicates how far the trader is going to move per day.")
            .append($speedLabel);

        const $button = $("<button>")
            .text("Retire trader")
            .attr("title", "The trader will return to the trader pool and to be reassigned.")
            .click(() => fleet.retire());
        const $general = $("<fieldset>")
            .append(
                $("<legend>").text("General"),
                $speed,
                $button,
        );

        const $route = $("<fieldset>")
            .attr("title", "This table shows a list of places that the trader is going to trader. Dest means the trader is heading towards that place.")
            .append(
                $("<legend>").text("Route"),
                this.tableDrawer.$getTable(),
        );

        $(view)
            .empty()
            .append($general, $route);

        this.observer = {
            update: () => {
                $button.prop("disabled", fleet.isRetire());
                $speedLabel.text(this.fleet.getSpeed(galaxy).toFixed(2));
            },
        };
    }

    public update(game: Game, channels: Set<UpdateChannel>) {

        const galaxy = game.galaxy;

        this.observer.update(game, channels);

        this.tableDrawer
            .render(this.fleet.getRoute(), (stop) => {
                const homePlanet = stop.getHomePlanet();
                const [x, y] = galaxy.getCoor(homePlanet);
                const coor = `Planet ${homePlanet.id} - (${x.toFixed(2)},${y.toFixed(2)})`;
                const route = this.fleet.getRoute();
                const at = this.fleet.getRouteAt();
                const isDest = route[at] === stop;
                return [
                    coor,
                    isDest ? `<i class="material-icons">check</i>` : "",
                ];
            });
    }
}

class CargoPanel implements View.Observer {

    private tableDrawer = new DrawTable<[Model.Product, number]>([
        ["Goods", ([productA], [productB]) => productA - productB],
        ["Qty", ([, qtyA], [, qtyB]) => qtyA - qtyB],
    ], () => this.update());

    constructor(
        readonly view: HTMLElement,
        private fleet: Model.Fleet,
    ) {
        $(view)
            .empty()
            .append(this.tableDrawer.$getTable());
    }

    public update() {
        this.tableDrawer
            .render(Immutable
                .Seq(this.fleet.getCargo().getAllQty())
                .filter(([qty]) => qty > 0)
                .toArray(),
                ([product, qty]) => [
                    Model.Product[product],
                    qty,
                ]);
    }
}
