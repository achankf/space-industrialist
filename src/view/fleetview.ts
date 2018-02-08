import * as Algo from "../algorithm/algorithm";
import { Game, UpdateChannel } from "../game.js";
import { DrawTable } from "../html.js";
import * as Model from "../model/model.js";
import * as View from "./view.js";

export class FleetView implements View.Observer {

    public readonly view = document.createElement("div");

    private contents: View.Observer | undefined;
    private readonly theContents = document.createElement("div");

    constructor(
        game: Game,
        private fleet: Model.Fleet,
    ) {
        const title = View.$createTitlebar(game, this, `Fleet ${fleet.id}`);
        const contentPanel = View.$createContentPanel();

        const $tabs = $("<nav>")
            .addClass("tabs")
            .appendTo(contentPanel);

        $(this.theContents)
            .appendTo(contentPanel);

        $("<div>")
            .text("Route")
            .click(() => this.setRoutePanel(game))
            .appendTo($tabs);
        $("<div>")
            .text("Cargo")
            .click(() => this.setCargoPanel(game))
            .appendTo($tabs);

        this.setRoutePanel(game);

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

    public update(game: Game, channels: Set<UpdateChannel>) {
        if (this.contents !== undefined) {
            this.contents.update(game, channels);
        }
    }

    private setRoutePanel(game: Game) {
        this.contents = new RoutePanel(game, this.theContents, this.fleet);
    }

    private setCargoPanel(game: Game) {
        this.contents = new CargoPanel(this.theContents, this.fleet);
    }
}

class RoutePanel implements View.Observer {

    private tableDrawer: DrawTable<Model.RouteStop>;

    constructor(
        game: Game,
        private readonly view: HTMLElement,
        private readonly fleet: Model.Fleet,
    ) {
        const galaxy = game.galaxy;
        const getCoor = galaxy.getCoor;
        this.tableDrawer = new DrawTable<Model.RouteStop>([
            ["Coor", undefined],
            ["Dest", undefined],
        ], () => this.update(game));

        $(view)
            .empty()
            .append(this.tableDrawer.getTable());
    }

    public update(game: Game) {

        const galaxy = game.galaxy;

        this.tableDrawer
            .render(this.fleet.getRoute(), (stop) => {
                const [x, y] = galaxy.getCoor(stop);
                const coor = `${Model.MapDataKind[stop.kind]} - (${x.toFixed(2)},${y.toFixed(2)})`;
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
        private readonly view: HTMLElement,
        private fleet: Model.Fleet,
    ) {
        $(view)
            .empty()
            .append(this.tableDrawer.getTable());
    }

    public update() {
        this.tableDrawer
            .render(Array
                .from(this.fleet.getCargo().getAllQty()), ([product, qty]) => [
                    Model.Product[product],
                    qty,
                ]);
    }
}
