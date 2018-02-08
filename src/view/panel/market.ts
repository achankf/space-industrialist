import * as Algo from "../../algorithm/algorithm";
import { Game, UpdateChannel } from "../../game.js";
import { DrawTable } from "../../html.js";
import * as Model from "../../model/model.js";
import * as View from "../view.js";

interface IMarketRow {
    product: Model.Product;
    price: number;
    qty: number;
    demand: number;
    aggDemand: number;
    globalDemands: number;
    globalProdCap: number;
}

export class MarketPanel implements View.Observer {

    private tableDrawer: DrawTable<IMarketRow>;

    constructor(
        game: Game,
        private readonly view: HTMLElement,
        private readonly market: Model.Market,
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
            ["Basic", (rowA, rowB) => rowA.demand - rowB.demand],
            ["Agg", (rowA, rowB) => rowA.aggDemand - rowB.aggDemand],
            ["G Demand", (rowA, rowB) => rowA.globalDemands - rowB.globalDemands],
            ["G ProdCap", (rowA, rowB) => rowA.globalProdCap - rowB.globalProdCap],
        ], () => this.update(game, Algo.union(UpdateChannel.DataChange)));

        $(view)
            .empty()
            .append(this.tableDrawer.getTable());
    }

    public update(game: Game, channels: Set<UpdateChannel>) {

        if (!channels.has(UpdateChannel.DataChange)) {
            return;
        }

        const galaxy = game.galaxy;
        const market = this.market;
        const marketInventory = market.getInventory();

        const data = Model
            .allProducts()
            .map((product) => {
                return {
                    product,
                    price: market.getPrice(galaxy, product),
                    qty: marketInventory.getQty(product),
                    demand: market.getDemand(galaxy, product),
                    aggDemand: market.getAggDemand(galaxy, product),
                    globalDemands: galaxy.getGalacticDemands(product),
                    globalProdCap: galaxy.getGalacticProdCap(product),
                };
            });

        this.tableDrawer
            .render(data, (row) => [
                row.product,
                Model.Product[row.product],
                row.price.toFixed(2),
                row.qty,
                row.demand,
                row.aggDemand,
                row.globalDemands,
                row.globalProdCap,
            ]);
    }
}
