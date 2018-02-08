import { Game, UpdateChannel } from "../game.js";
import { IObserver } from "../observer.js";
import { FleetView } from "./fleetview.js";
import { OrganizationView } from "./organizationview.js";
import { PlanetView } from "./planetview.js";
import { SelectView } from "./selectview.js";

export * from "./fleetview.js";
export * from "./mapview.js";
export * from "./planetview.js";
export * from "./selectview.js";
export * from "./menu.js";
export * from "./organizationview.js";

export type Observer = IObserver<Game, UpdateChannel>;
export type ClosableView = FleetView | OrganizationView | PlanetView | SelectView;

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

    $(document)
        .mouseup(() => {
            $(document)
                .off("mouseup")
                .off("mousemove");
        })
        .mousemove((eInner) => {
            let [newY, newX] = [eInner.clientY! - clickPosDiff.top, eInner.clientX! - clickPosDiff.left];
            if (newX < 0) {
                newX = 0;
            }
            const maxX = $(document.body).width()! - $ele.innerWidth()!;
            if (newX > maxX) {
                newX = maxX;
            }
            if (newY < 0) {
                newY = 0;
            }
            const maxY = $(document.body).height()! - $ele.innerHeight()!;
            if (newY > maxY) {
                newY = maxY;
            }
            $ele.offset({ top: newY, left: newX });
        });
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

export function $createContentPanel() {
    return $("<div>").addClass("panel-content");
}
