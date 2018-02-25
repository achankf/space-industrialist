import * as Immutable from "immutable";
import * as Algo from "../algorithm/algorithm";
import { Game, UpdateChannel } from "../game";
import { DrawTable } from "../html";
import * as Model from "../model/model";
import { allProducts, Product } from "../model/product";
import * as View from "./view";

const BASIC_GOODS = [Product.Food, Product.Drink, Product.Apparel, Product.Medicine]
    .map((product) => Product[product])
    .join();
const LUXURY_GOODS = [Product.Accessory, Product.Furniture, Product.Gadget, Product.Vehicle]
    .map((product) => Product[product])
    .join();
const RAW_MATERIALS = Model.RAW_MATERIALS
    .map((product) => Product[product])
    .join();
const SECONDARY_MATERIALS = Immutable
    .Set(allProducts())
    .subtract(Model.RAW_MATERIALS)
    .map((product) => Product[product])
    .join();

export class PlanetView implements View.Observer {

    public readonly view = document.createElement("div");

    private contents: View.Observer;
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
            this.contents.update(game, channels);
        }
    }

    public setMarketPanel(game: Game, colony: Model.Colony) {
        const panel = new MarketPanel(game, this.theContents, colony);
        this.contents = panel;
        this.contents.update(game, new Set([UpdateChannel.DataChange]));
    }

    public setIndustryPanel(game: Game, colony: Model.Colony) {
        const panel = new IndustryPanel(game, this.theContents, colony);
        this.contents = panel;
        panel.update(game, new Set([UpdateChannel.DataChange]));
    }

    public setInfoPanel(game: Game) {
        const panel = new PlanetInfoPanel(game, this.theContents, this.planet);
        this.contents = panel;
        panel.update(game, new Set([UpdateChannel.DataChange]));
    }

    private layout(game: Game) {
        const planet = this.planet;
        const $title = View.$createTitlebar(game, this, `Planet ${planet.id}`);
        const $contentPanel = View.$addContentPanelClass(this.theContents);

        const list = [$title];

        const $tabs = $("<nav>")
            .addClass("tabs");

        if (this.planet.isColonized()) {
            const colony = planet.getColony()!;
            $("<div>")
                .text("Planet")
                .click(() => this.setInfoPanel(game))
                .appendTo($tabs);

            $("<div>")
                .text("Market")
                .click(() => this.setMarketPanel(game, colony))
                .appendTo($tabs);

            $("<div>")
                .text("Industry")
                .click(() => this.setIndustryPanel(game, colony))
                .appendTo($tabs);
        }

        if ($tabs.children().length > 0) {
            list.push($tabs);
        }

        list.push($contentPanel);

        $(this.view).empty();
        View
            .$addPanelClass(this)
            .append(...list)
            .mousedown((e) => View.makeDraggable(this.view, e))
            .click(() => View.bringToFront(this.view));

        this.setInfoPanel(game);
        $(document.body).append(this.view);
    }
}

class IndustryPanel implements View.Observer {

    private observables: View.Observer[] = [];

    constructor(
        game: Game,
        private readonly view: HTMLElement,
        private readonly colony: Model.Colony,
    ) {
        this.layout(game);
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        if (channels.has(UpdateChannel.RecreateIndustryLayout)) {
            this.layout(game);
        }
        for (const observable of this.observables) {
            observable.update(game, channels);
        }
    }

    private layout(game: Game) {
        const colony = this.colony;
        const galaxy = game.galaxy;
        const industries = galaxy.getIndustries(colony);

        const groups = new Map(Array
            .from(industries)
            .map((x) => [x.productType, x] as [Product, Model.Industry]));

        const localResource = colony.getHomePlanet().resource;
        // only show goods that the planet can produce
        const displayProducts = allProducts()
            .filter((product) => product === localResource || // is the raw material that the planet can produce
                Model.SECONDARY_PRODUCTS.has(product) || // is a secondary product (one that require post-processed goods to produce)
                Model.Industry
                    .getFlatDemandProducts(product)
                    .has(localResource)) // or the produce is needed by industries
            .sort();

        const data = $("<table>").append(...this.makeIndustryDivContainer(game, groups, displayProducts));

        $(this.view)
            .empty()
            .append(data)
            .click((e) => e.stopPropagation());
    }

    private *makeIndustryDivContainer(game: Game, industries: Map<Product, Model.Industry>, products: Product[]) {

        const galaxy = game.galaxy;

        let showProducts;
        if (industries.size < 2) {
            showProducts = products;
        } else {
            showProducts = Array
                .from(industries.values())
                .map((x) => x.productType);
        }

        for (const product of showProducts) {
            const industry = industries.get(product);
            let contents;
            const controlButtons = $("<div>");
            if (industry === undefined) {
                contents = this.makeBuildButton(game, product);
            } else {
                contents = this.makeIndustryDiv(game, industry);

                controlButtons
                    .append(
                        $("<button>")
                            .text("+")
                            .attr("title", "expand industry (increase scale by 1)")
                            .click((e) => {
                                const isOk = e.shiftKey || e.ctrlKey || confirm(`Are you sure? This action costs $${Model.INDUSTRY_COST} reduces operational efficiency. (press ctrl while clicking the button suppresses this message, press shift for 10 times this operation)`);
                                if (e.shiftKey) {
                                    for (let i = 0; i < 10; i++) {
                                        industry.upgrade();
                                        galaxy.withdraw(Model.INDUSTRY_COST);
                                    }
                                } else if (isOk) {
                                    industry.upgrade();
                                    galaxy.withdraw(Model.INDUSTRY_COST);
                                } else {
                                    return; // nothing changes
                                }
                                game.queueUpdate(UpdateChannel.DataChange);
                            }),
                        $("<button>")
                            .text("-")
                            .attr("title", "down size (decrease scale by 1)")
                            .click((e) => {
                                const isOk = e.shiftKey || e.ctrlKey || confirm(`Are you sure? This action costs $${Model.INDUSTRY_DEMOLISH_COST} reduces operational efficiency. (press ctrl while clicking the button suppresses this message, press shift for 10 times this operation)`);
                                if (isOk) {
                                    if (e.shiftKey) {
                                        for (let i = 0; i < 10; i++) {
                                            industry.downSize();
                                            galaxy.withdraw(Model.INDUSTRY_DEMOLISH_COST);
                                        }
                                    } else {
                                        industry.downSize();
                                        galaxy.withdraw(Model.INDUSTRY_DEMOLISH_COST);
                                    }
                                    game.queueUpdate(UpdateChannel.DataChange);
                                }
                            }),
                        $("<button>")
                            .text("X")
                            .attr("title", "shut down (free up the industry slot)")
                            .click((e) => {
                                const industryScale = industry.getScale();
                                const demolishCost = industryScale * Model.INDUSTRY_DEMOLISH_COST;
                                const isOk = e.ctrlKey || confirm(`Are you sure? This action costs $${demolishCost} reduces operational efficiency. (press ctrl while clicking the button suppresses this message)`);
                                if (isOk) {
                                    galaxy.shutdownIndustry(this.colony, industry);
                                    galaxy.withdraw(demolishCost);
                                    game.queueUpdate(UpdateChannel.RecreateIndustryLayout, UpdateChannel.DataChange);
                                }
                            }));
            }
            yield $("<tr>").append(
                $("<td>")
                    .text(Product[product])
                    .attr("title", PRODUCT_HOVER_TEXT.get(product)!)
                    .append(controlButtons),
                $("<td>").append(contents),
            );
        }
    }

    private makeBuildButton(game: Game, product: Product) {
        return $("<button>")
            .text("+ Build")
            .click((e) => {
                const isOk = e.ctrlKey || confirm(`Are you sure? This action costs $${Model.INDUSTRY_COST}, and will take up a building slot (max 2 per planet). (press ctrl while clicking the button suppresses this message)`);
                if (isOk) {
                    const galaxy = game.galaxy;
                    galaxy.addIndustry(product, this.colony);
                    galaxy.withdraw(Model.INDUSTRY_COST);
                    game.queueUpdate(UpdateChannel.RecreateIndustryLayout);
                    this.layout(game);
                }
            });
    }

    private makeIndustryDiv(game: Game, industry: Model.Industry) {
        const galaxy = game.galaxy;
        const $container = $("<div>");

        const $scaleLabel = $("<span>");
        $("<div>")
            .attr("title", "Production scale is the size of your industrial complex. It determines production capacity and input consumption.")
            .text("Production Scale: ")
            .append($scaleLabel)
            .appendTo($container);

        const $prodCapLabel = $("<span>");
        $("<div>")
            .attr("title", "Production capacity is the number of goods that the industrial complex can produce when running 100% efficiency and has enough input goods.")
            .text("Production Capacity: ")
            .append($prodCapLabel)
            .appendTo($container);

        const $opEffLabel = $("<span>");
        $("<div>")
            .attr("title", `Operational efficiency determines prod cap and the fixed cost per unit. Industrial complexes that produce raw materials [${RAW_MATERIALS}] need [${Product[Product.Tool]}] to increase eff, while secondary products [${SECONDARY_MATERIALS}] need [${Product[Product.Machine]}] to increase eff.`)
            .text("Operational Eff.: ")
            .append($opEffLabel)
            .appendTo($container);

        const $usedEnergyLabel = $("<span>");
        $("<div>")
            .attr("title", "The amount of energy used by this industrial complex. The real cost is Energy Usage times Unit Price (found this in planet panel).")
            .text("Energy Usage: ")
            .append($usedEnergyLabel)
            .appendTo($container);

        const $costPerUnitLabel = $("<span>");
        $("<div>")
            .attr("title", "Fixed cost the amount of money that is used to produce a unit of product; input materials & energy cost aren't included.")
            .text("Fixed Cost Per Unit: ")
            .append($costPerUnitLabel)
            .appendTo($container);

        this.observables.push({
            update: () => {
                $scaleLabel.text(industry.getScale());
                $prodCapLabel.text(industry.prodCap(galaxy));

                const opEff = industry.getOperationalEff() * 100;
                $opEffLabel.text(opEff.toFixed(2));

                const usedEnergy = industry.usedEnergy(galaxy);
                $usedEnergyLabel.text(usedEnergy.toFixed(2));

                const costPerUnit = industry.getCostPerUnit();
                $costPerUnitLabel.text(`$${costPerUnit.toFixed(2)}`);
            },
        });

        return $container;
    }
}

function createProductHoverText(product: Product) {
    const isRaw = Model.RAW_MATERIALS_SET.has(product as Model.RawMaterial);
    const consumes = Immutable
        .Seq(Model.DEMAND_PRODUCTS[product])
        .reduce((acc, cur) => acc.union(cur), Immutable.Set<Product>())
        .map((x) => Product[x])
        .join(", ");
    return `Is ${isRaw ? "RAW material" : `SECONDARY product; consumes ${consumes}`}`;
}

const PRODUCT_HOVER_TEXT = new Map(Model
    .allProducts()
    .map((x) => [x, createProductHoverText(x)] as [Product, string]));

class PlanetInfoPanel implements View.Observer {

    private observables = new Set<View.Observer>();

    constructor(
        private readonly game: Game,
        private readonly view: HTMLElement,
        planet: Model.Planet,
    ) {
        const galaxy = game.galaxy;
        const resource = planet.resource;
        const [x, y] = galaxy.getCoor(planet);

        const isColonized = planet.isColonized();

        const rows = [
            $("<tr>")
                .attr("title", "This is the type of resource that this planet can produce locally.")
                .append(
                    $("<td>").text(`Resource`),
                    $("<td>").text(`${Product[resource]}`)),
            $("<tr>")
                .attr("title", "This is the coordinates of the planet.")
                .append(
                    $("<td>").text(`Coor`),
                    $("<td>").append(`(${x.toFixed(2)},${y.toFixed(2)})`)),
        ];

        // population row
        if (isColonized) {
            const $planetPopLabel = $("<span>");
            rows.push($("<tr>")
                .attr("title", `A planet's population determines domestic consumption of basic goods [${BASIC_GOODS}] and luxury goods [${LUXURY_GOODS}], which is one of the 2 ways that allow you to trade goods for money (the other way being supply fuel to power plants).`)
                .append(
                    $("<td>").text("Population"),
                    $("<td>").append($planetPopLabel)));

            const colony = planet.getColony()!;
            console.assert(colony !== undefined);

            this.observables.add({
                update: () => {
                    const pop = colony.getPopulation();
                    const max = colony.getMaxPop();
                    $planetPopLabel.text(`${pop.toFixed(2)}/${max}`);
                },
            });
        } else {
            const $colonizeButton = $("<button>")
                .text("Colonize")
                .click(() => {
                    galaxy.colonizePlanet(planet, 1);
                    $(this).remove();
                    this.game.queueUpdate(UpdateChannel.MapChange);
                });
            rows.push($("<tr>")
                .attr("title", "Spend 1 free colonist to colonize this planet. You can encourage growth from colonized planets.")
                .append(
                    $("<td>")
                        .attr("colspan", 2)
                        .append($colonizeButton)));

            this.observables.add({
                update: () => {
                    $colonizeButton.prop("disabled", galaxy.getNumColonists() < 1);
                },
            });
        }

        if (isColonized) {
            {
                const colony = planet.getColony()!;
                console.assert(colony !== undefined);

                const $growthLabel = $("<span>");
                rows.push($("<tr>")
                    .attr("title", `Growth occurs when population consumes enough food; similarly starvation occurs when citizens lack food. Bonus growth is determined by 2 major factors: 1) citizens' satisfaction of basic [${BASIC_GOODS}] and luxuary goods [${LUXURY_GOODS}], and 2) sufficient power supply.`)
                    .append(
                        $("<td>").text("Annual growth"),
                        $("<td>").append($growthLabel)));

                this.observables.add({
                    update: () => {
                        const growthRate = colony.growthRate(galaxy);
                        $growthLabel.text(`${growthRate > 0 ? "+" : ""}${Math.round(growthRate * 100)}%`);
                    },
                });

                const checkbox = document.createElement("input");
                const $checkbox = $(checkbox)
                    .attr("type", "checkbox")
                    .change(() => {
                        const isLimitPop = checkbox.checked;
                        colony.lockPopulation(isLimitPop);
                    });

                this.observables.add({
                    update: () => {
                        $checkbox.prop("checked", colony.lockPopulation());
                    },
                });

                rows.push($("<tr>")
                    .attr("title", "This option locks the current population, and any growth on this planet will be transferred to the colonist pool. Since industrial production is not affected by population, encouraging colonists a great way to lock down power usage.")
                    .append(
                        $("<td>").text("Encourage Colonists?"),
                        $("<td>").append($checkbox)));

                {
                    const $fuelDemand = $("<span>");
                    const $powerPlanetLvl = $("<span>");
                    const $powerOutput = $("<span>");
                    const $price = $("<span>");
                    const $producerTable = $("<table>").append(
                        $("<tr>")
                            .attr("title", "This is the size of the power plant. Each level proportionally affects power output and fuel consumption -- the higher the level, the more power to be output and more fuel to be consumed.")
                            .append(
                                $("<td>").text("Power planet level"),
                                $("<td>").append($powerPlanetLvl),
                        ),
                        $("<tr>")
                            .attr("title", "Fuel demand is the quantity needed to run the power plants at 100% efficiency. This quantity is the same as what you see in the market for fuel demand.")
                            .append(
                                $("<td>").text("Fuel demand"),
                                $("<td>").append($fuelDemand),
                        ),
                        $("<tr>")
                            .attr("title", "This is the actual power output of the power plants.")
                            .append(
                                $("<td>").text("Output"),
                                $("<td>").append($powerOutput),
                        ),
                        $("<tr>")
                            .attr("title", "This is how much 1 unit of energy is worth, subject to demand/supply. Both industries and civilians use power, so in the early game you might want to separate industrial planets and consumer planets.")
                            .append(
                                $("<td>").text("Unit price"),
                                $("<td>").append($price),
                        ),
                    );

                    const $indUsage = $("<span>");
                    const $traderUsage = $("<span>");
                    const $civUsage = $("<span>");
                    const $consumerTable = $("<table>").append(
                        $("<tr>")
                            .attr("title", "This is the maximum energy that your industrial complexes need.")
                            .append(
                                $("<td>").text("Industry"),
                                $("<td>").append($indUsage),
                        ),
                        $("<tr>")
                            .attr("title", "This is the maximum energy that your traders need.")
                            .append(
                                $("<td>").text("Trader"),
                                $("<td>").append($traderUsage),
                        ),
                        $("<tr>")
                            .attr("title", "This is the maximum energy that the local population needs.")
                            .append(
                                $("<td>").text("Civilian"),
                                $("<td>").append($civUsage),
                        ),
                    );

                    const $expandButton = $("<button>")
                        .text("+")
                        .attr("title", `Invest $${Model.POWER_PLANT_COST} to build a new power plant, if you have the money. Just a reminder, you don't own any power plants; however, these power plants buy fuel from you.`)
                        .click((e) => {
                            const isOk = e.ctrlKey || confirm(`Are you sure to invest in power planet at planet ${planet.id}? This action costs $${Model.POWER_PLANT_COST}. (press ctrl while clicking the button suppresses this message)`);
                            if (isOk) {
                                colony.expandPowerPlanet(galaxy);
                                galaxy.withdraw(Model.POWER_PLANT_COST);
                            }
                        });

                    const $producer = $("<fieldset>")
                        .attr("title", "The producer panel shows details about power plants of this planet.")
                        .append($("<legend>").text("Producer"))
                        .append($producerTable);

                    const $consumer = $("<fieldset>")
                        .attr("title", "The consumer panel shows details about *POTENTIAL* energy consumption on this planet. If the planet has a shortage, energy will be distributed evenly with best effort.")
                        .append($("<legend>").text("Consumer"))
                        .append($consumerTable);

                    const $summary = $("<span>");

                    rows.push($("<tr>")
                        .append(
                            $("<td>")
                                .attr("colspan", 2)
                                .attr("title", "Citizens and industrial complexes need power to be run efficiently. Ideally, you want to keep power surplus, so that the local colony and your industrial complexes can run at optimal efficiency.")
                                .text("Power")
                                .append($summary)
                                .append($expandButton, $producer, $consumer)));

                    this.observables.add({
                        update: () => {
                            const powerPlanetLvl = colony.getPowerPlanetLevel();
                            $fuelDemand.text(colony.getFuelDemand());
                            $powerPlanetLvl.text(powerPlanetLvl);
                            const output = colony.getPowerOutput();
                            const eff = colony.getPowerOutputEff() * 100;
                            $powerOutput.text(`${output} (eff:${eff.toFixed(0)}%)`);
                            $indUsage.text(colony.getIndustrialPowerUsage(galaxy));
                            $traderUsage.text(colony.getTraderPowerUsage(galaxy));
                            $civUsage.text(colony.getCivilianPowerUsage());

                            const canExpand = galaxy.getMoney() > Model.POWER_PLANT_COST && colony.canExpandPowerPlant(galaxy);
                            $expandButton.prop("disabled", !canExpand);

                            const totalUsage = colony.getTotalPowerUsage(galaxy);
                            const totalOutput = colony.getPowerOutput();
                            const powerUsageEff = colony.getPowerUsageEff(galaxy) * 100;
                            const summary = ` ${totalUsage}/${totalOutput} (${powerUsageEff.toFixed(2)}%) `;
                            $summary.text(summary);

                            const price = colony.getEnergyPrice(galaxy);
                            $price.text(`$${price.toFixed(2)}`);
                        },
                    });
                }
            }
        }

        $(this.view)
            .empty()
            .append($("<table>").append(...rows));
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        for (const observable of this.observables) {
            observable.update(game, channels);
        }
    }
}

interface IMarketRow {
    product: Model.Product;
    price: number;
    qty: number;
    demand: number;
    globalDemands: number;
    globalProdCap: number;
    globalSupply: number;
}

class MarketPanel implements View.Observer {

    private tableDrawer: DrawTable<IMarketRow>;

    constructor(
        readonly game: Game,
        readonly view: HTMLElement,
        private readonly colony: Model.Colony,
    ) {
        this.tableDrawer = new DrawTable<IMarketRow>([
            ["Id", (rowA, rowB) => rowA.product - rowB.product],
            ["Goods", (rowA, rowB) => {
                const strA = Model.Product[rowA.product];
                const strB = Model.Product[rowB.product];
                return Algo.cmpStr(strA, strB);
            }],
            ["Price", (rowA, rowB) => rowA.price - rowB.price],
            ["Qty", (rowA, rowB) => rowA.qty - rowB.qty],
            ["Local Demand", (rowA, rowB) => rowA.demand - rowB.demand],
            ["Galactic Demand", (rowA, rowB) => rowA.globalDemands - rowB.globalDemands],
            ["Galactic ProdCap", (rowA, rowB) => rowA.globalProdCap - rowB.globalProdCap],
            ["Galactic Supply", (rowA, rowB) => rowA.globalSupply - rowB.globalSupply],
        ], () => this.update(game));

        $(view)
            .empty()
            .append(this.tableDrawer
                .$getTable()
                .attr("title", `The market determines local price by demand & supply. Looking at the big picture, you want to make sure the market reaches equilibrium by matching up the galactic demand and the galactic production cap.

The galactic production cap is a potential quantity that the entire galaxy can produce. However, if your industrial complexes lack input resource, they might produce goods at a lower quantity than the prod cap.

Since you are the only player in the galaxy, the only way to earn money is to sell goods that are consumed by citizens [${BASIC_GOODS}, ${LUXURY_GOODS}] and by power plants [${Model.Product[Model.Product.Fuel]}] -- other intermediate goods are merely transferred to your industry by your traders, e.g. when you trader sells a unit of Crop, your industry will buy it back, so no money is earned.

Finally, you want to overproduce goods that are used to maintain civilian & industrial growth [Food, Fuel, Tool, Machine], instead of maintaining equilibrium. Your real cash cows are luxury goods.`));
    }

    public update(game: Game) {

        const galaxy = game.galaxy;

        const data = Model
            .allProducts()
            .map((product) => {
                return {
                    product,
                    price: this.colony.getPrice(product),
                    qty: this.colony.getSupply(product),
                    demand: this.colony.getDemand(product),
                    globalDemands: galaxy.getGalacticDemands(product),
                    globalProdCap: galaxy.getGalacticProdCap(product),
                    globalSupply: galaxy.getGalacticSupplies(product),
                };
            });

        this.tableDrawer
            .render(data, (row) => [
                row.product,
                Model.Product[row.product],
                row.price.toFixed(2),
                row.qty,
                row.demand,
                row.globalDemands,
                row.globalProdCap,
                row.globalSupply,
            ]);
    }
}
