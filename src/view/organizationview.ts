import { Game, UpdateChannel } from "../game.js";
import * as View from "./view.js";

export class OrganizationView implements View.Observer {

    public static id = "showOrg";
    public readonly view = document.createElement("div");
    private observables: View.Observer[] = [];

    constructor(
        private game: Game,
    ) {
        const comapny = game.galaxy.getCompany();
        const orgId = `${comapny.id}`;
        const title = View.$createTitlebar(game, this, `Organization`);
        const contentPanel = View.$createContentPanel();
        const money = $("<div>").attr("id", orgId);
        this.observables.push({
            update: () => $(`#${orgId}`)
                .text(`Id: ${comapny.id}`),
        });

        contentPanel.append(money);

        View
            .$addPanelClass(this)
            .attr("id", OrganizationView.id)
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
        for (const observable of this.observables) {
            observable.update(game, channels);
        }
    }
}
