import * as React from "react";
import { Game } from "../../../game";
import * as Model from "../../../model";

interface IControlButtonsOwnProps {
    colony: Model.Colony;
    game: Game;
    industry: Model.Industry;
}

type ControlButtonsProps = IControlButtonsOwnProps;

export default class ControlButtons extends React.Component<ControlButtonsProps> {
    public render() {
        return <div>
            <button
                onClick={this.updateIndustry}
                title="expand industry (increase scale by 1)"
            >+</button>
            <button
                onClick={this.downScaleIndustry}
                title="down size (decrease scale by 1)"
            >-</button>
            <button
                onClick={this.demolishIndustry}
                title="shut down (free up the industry slot)"
            >X</button>
        </div>;
    }

    private updateIndustry = (e: React.MouseEvent<HTMLButtonElement>) => {

        const isOk = e.shiftKey || e.ctrlKey || confirm(`Are you sure? This action costs $${Model.INDUSTRY_COST} reduces operational efficiency. (press ctrl while clicking the button suppresses this message, press shift for 10 times this operation)`);

        const industry = this.props.industry;
        const game = this.props.game;
        const galaxy = game.getWriter();

        if (isOk) {
            if (e.shiftKey) {
                for (let i = 0; i < 10; i++) {
                    industry.upgrade();
                    galaxy.withdraw(Model.INDUSTRY_COST);
                }
            } else {
                industry.upgrade();
                galaxy.withdraw(Model.INDUSTRY_COST);
            }
        }
    }

    private downScaleIndustry = (e: React.MouseEvent<HTMLButtonElement>) => {

        const isOk = e.shiftKey || e.ctrlKey || confirm(`Are you sure? This action costs $${Model.INDUSTRY_DEMOLISH_COST} reduces operational efficiency. (press ctrl while clicking the button suppresses this message, press shift for 10 times this operation)`);

        const industry = this.props.industry;
        const game = this.props.game;
        const galaxy = game.getWriter();

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
        }
    }

    private demolishIndustry = (e: React.MouseEvent<HTMLButtonElement>) => {

        const industry = this.props.industry;
        const game = this.props.game;
        const galaxy = game.getWriter();
        const colony = this.props.colony;
        const industryScale = industry.getScale();
        const demolishCost = industryScale * Model.INDUSTRY_DEMOLISH_COST;
        const isOk = e.ctrlKey || confirm(`Are you sure? This action costs $${demolishCost} reduces operational efficiency. (press ctrl while clicking the button suppresses this message)`);
        if (isOk) {
            galaxy.shutdownIndustry(colony, industry);
            galaxy.withdraw(demolishCost);
        }
    }
}
