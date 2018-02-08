import * as Algo from "../../algorithm/algorithm";
import { Game, UpdateChannel } from "../../game.js";
import * as Model from "../../model/model.js";
import * as View from "../view.js";

export class IndustryPanel implements View.Observer {

    private observables: View.Observer[] = [];

    constructor(
        game: Game,
        private readonly view: HTMLElement,
        private readonly habitat: Model.Habitat,
    ) {
        this.layout(game);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        if (channels.has(UpdateChannel.RecreateIndustryLayout)) {
            this.layout(game);
        }
        if (channels.has(UpdateChannel.DataTurnChange)) {
            for (const observable of this.observables) {
                observable.update(game, channels);
            }
        }
    }

    private layout(game: Game) {
        const habitat = this.habitat;
        const galaxy = game.galaxy;
        const industries = galaxy.getIndustries(habitat.getHome());

        const groups = Algo.group((industry) => industry.productType, ...industries);

        const resource = habitat.getHome().resource;

        const data = $("<table>").append(Model.allProducts()
            .filter((product) => {
                const demands = Model.Industry.getDemandProducts(product);
                return product === resource ||
                    demands.some((ingredients) => ingredients.has(resource));
            })
            .sort((a, b) => Algo.cmpStr(Model.Product[a], Model.Product[b]))
            .map((product) => $("<tr>")
                .append($("<td>").text(Model.Product[product]))
                .append(this.makeAllIndustryDiv(game, groups, product))));

        $(this.view)
            .empty()
            .append(data)
            .click((e) => e.stopPropagation());
    }

    private makeAllIndustryDiv(game: Game, groups: Map<Model.Product, Model.Industry[]>, product: Model.Product) {
        const group = Algo.getOr(groups, product, () => []);
        if (group.length === 0) {
            return this.makeBuildButton(game, product);
        }
        return group.map((industry) => this.makeIndustryDiv(game, industry));
    }

    private makeBuildButton(game: Game, product: Model.Product) {
        return $("<div>")
            .addClass("industry-data")
            .text("+ Build")
            .click(() => {
                const galaxy = game.galaxy;
                galaxy.addIndustry(product, this.habitat.getHome(), galaxy.getCompany());
                game.queueUpdate(UpdateChannel.RecreateIndustryLayout, UpdateChannel.DataTurnChange);
            });
    }

    private makeIndustryDiv(game: Game, industry: Model.Industry) {
        const galaxy = game.galaxy;
        const container = $("<div>");

        const scaleLabel = $("<span>");
        $("<div>")
            .text("Production Scale: ")
            .append(scaleLabel)
            .appendTo(container);

        const prodCapLabel = $("<span>");
        $("<div>")
            .text("Production Capacity: ")
            .append(prodCapLabel)
            .appendTo(container);

        const opEffLabel = $("<span>");
        $("<div>")
            .text("Operational Eff.: ")
            .append(opEffLabel)
            .appendTo(container);

        const runningEffLabel = $("<span>");
        $("<div>")
            .text("Running Eff.: ")
            .append(runningEffLabel)
            .appendTo(container);

        this.observables.push({
            update: () => {
                scaleLabel.text(industry.getScale());
                prodCapLabel.text(industry.prodCap(galaxy));

                const opEff = industry.getOperationalEff() * 100;
                opEffLabel.text(`${opEff.toFixed(2)}%`);

                const runningEff = industry.getRunningEff() * 100;
                runningEffLabel.text(`${runningEff.toFixed(2)}%`);
            },
        });

        return container;
    }
}
