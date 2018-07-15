import * as Immutable from "immutable";
import { toIt } from "myalgo-ts";
import * as React from "react";
import { Game } from "../../../game";
import { Colony } from "../../../model/colony";
import { Industry as IndustryModel } from "../../../model/industry";
// auto-fix doesn't player well with tslint for RawMaterial and RAW_MATERIALS
// tslint:disable-next-line:ordered-imports
import { allProducts, DEMAND_PRODUCTS, Product, RawMaterial, RAW_MATERIALS, RAW_MATERIALS_SET, SECONDARY_PRODUCTS } from "../../../model/product";
import BuildButton from "./BuildButton";
import ControlButtons from "./ControlButtons";
import IndustryDetails from "./IndustryDetails";

// hover text that shows up when hovering resource column
const PRODUCT_HOVER_TEXT = Immutable.Map(allProducts()
    .map((product) => {

        const isRaw = RAW_MATERIALS_SET.has(product as RawMaterial);
        const consumes = Immutable
            .Seq(DEMAND_PRODUCTS[product])
            .reduce((acc, cur) => acc.union(cur), Immutable.Set<Product>())
            .map((x) => Product[x])
            .join(", ");

        const text = `Is ${isRaw ? "RAW material" : `SECONDARY product; consumes ${consumes}`}`;

        return [product, text] as [Product, string];
    }));

// a list of potential products that may be needed/produced by the products, group by raw materials
const POTENTIAL_PRODUCTS = Immutable.Map(RAW_MATERIALS
    .map((raw) => {
        const interested = allProducts()
            .filter((product) => product === raw || // is the raw material that the planet can produce
                SECONDARY_PRODUCTS.has(product) || // is a secondary product (one that require post-processed goods to produce)
                IndustryModel
                    .getFlatDemandProducts(product)
                    .has(raw)) // or the produce is needed by industries
            .sort();
        return [raw, Immutable.Set(interested)] as [RawMaterial, Immutable.Set<Product>];
    }));

interface IIndustryOwnProps {
    gameWrapper: { game: Game };
    colony: Colony;
}

type IndustryProps = IIndustryOwnProps;

export default class Industry extends React.Component<IndustryProps> {

    public render() {

        const game = this.props.gameWrapper.game;
        const colony = this.props.colony;
        const galaxy = game.getReader();
        const industries = galaxy.getIndustries(colony) || new Set<IndustryModel>();

        const productsInProd = Immutable
            .Seq(industries)
            .map((industry) => industry.productType)
            .toSet();

        const localResource = colony.getHomePlanet().resource;

        // products that will be shown in the industry screen
        const showProducts = industries.size === 2 ?
            productsInProd :
            POTENTIAL_PRODUCTS.get(localResource)!;

        const rows = showProducts
            .sortBy((product) => Product[product])
            .map((product) => {

                const industry = toIt(industries)
                    .filter((x) => x.productType === product)
                    .inject();

                return <tr key={product}>
                    <td title={PRODUCT_HOVER_TEXT.get(product)!}>
                        {Product[product]}
                        {
                            industry !== undefined ?
                                <ControlButtons
                                    colony={colony}
                                    game={game}
                                    industry={industry}
                                /> :
                                undefined
                        }
                    </td>
                    <td>
                        {
                            industry !== undefined ?
                                <IndustryDetails game={game} industry={industry} /> :
                                <BuildButton colony={colony} game={game} product={product} />
                        }
                    </td>
                </tr>;
            });

        return <table>
            <tbody>
                {rows}
            </tbody>
        </table>;
    }
}
