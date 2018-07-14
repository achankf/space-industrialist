import * as React from "react";
import { Game } from "../../../game";
import { INDUSTRY_COST } from "../../../model";
import { Colony } from "../../../model/colony";
import { Product } from "../../../model/product";

export default ({ colony, game, product }: { colony: Colony, game: Game, product: Product }) => {

    const buildIndustry = (e: React.MouseEvent<HTMLButtonElement>) => {
        const isOk = e.ctrlKey || confirm(`Are you sure? This action costs $${INDUSTRY_COST}, and will take up a building slot (max 2 per planet). (press ctrl while clicking the button suppresses this message)`);
        if (isOk) {
            const galaxy = game.getWriter();
            galaxy.addIndustry(product, colony);
            galaxy.withdraw(INDUSTRY_COST);
        }
    };

    return <button
        onClick={buildIndustry}
    >+ Build</button>;
};
