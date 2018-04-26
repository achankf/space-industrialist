import { Game, UpdateChannel } from "../game";
import { IObserver } from "../observer";
import { FleetView } from "./fleetview";
import { ImportExportView } from "./importexportview";
import { PlanetView } from "./planetview";
import { RouteSegmentView } from "./routesegment";
import { SelectView } from "./selectview";

export * from "./fleetview";
export * from "./importexportview";
export * from "./mapview";
export * from "./menu";
export * from "./planetview";
export * from "./routesegment";
export * from "./selectview";

export type Observer = IObserver<Game, UpdateChannel>;
export type ClosableView = FleetView | ImportExportView | PlanetView | SelectView | RouteSegmentView;

export function bringToFront(view: HTMLElement) {
    const $view = $(view);
    $view.parent().append($view);
}

type Event = JQuery.Event<HTMLElement, null>;

export function makeDraggable(view: HTMLElement, e: Event) {
    const $ele = $(view);
    const pos = $ele.position();
    const clickPosDiff = {
        top: e.clientY! - pos.top,
        left: e.clientX! - pos.left,
    };

    const gesture = new Hammer.Manager(view);
    const pan = new Hammer.Pan()
        .set({ direction: Hammer.DIRECTION_ALL });
    gesture.add(pan);
    gesture.on("pan", (eInner) => {
        console.log(eInner.type);
        let [newY, newX] = [
            Math.floor(eInner.center.y - clickPosDiff.top),
            Math.floor(eInner.center.x - clickPosDiff.left),
        ] as [number, number];
        // let [newY, newX] = [eInner.clientY! - clickPosDiff.top, eInner.clientX! - clickPosDiff.left];
        if (newX < 0) {
            newX = 0;
        }
        const maxX = Math.floor($(document.body).width()! - $ele.innerWidth()!);
        if (newX > maxX) {
            newX = maxX;
        }
        if (newY < 0) {
            newY = 0;
        }
        const maxY = Math.floor($(document.body).height()! - $ele.innerHeight()!);
        if (newY > maxY) {
            newY = maxY;
        }
        $ele.offset({ top: newY, left: newX });
    });
}

export function suspendDraggable() {
    $(document)
        .off("mouseup")
        .off("mousemove");
}

export function $createTitlebar(
    game: Game,
    view: ClosableView,
    title: string) {

    return $("<div>")
        .addClass("titlebar")
        .text(title)
        .append($("<span>")
            .append($("<span>")
                .html(`<i class="material-icons">create</i>`)
                .attr("title", "Pin this window")
                .click(() => game.pin(view)))
            .append($("<span>")
                .html(`<i class="material-icons">close</i>`)
                .attr("title", "Close this window")
                .click(() => game.close(view))));
}

export function $addPanelClass(view: ClosableView) {
    return $(view.view).addClass("panel");
}

export function $addContentPanelClass(element = document.createElement("div")) {
    return $(element).addClass("panel-content");
}
