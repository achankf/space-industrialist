import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "../../node_modules/redux";
import { Game } from "../game";
import * as Model from "../model";
import { addClosable, ClosableAction, ClosablePanelType } from "./action/closable_action";
import { ISpeedCommandAction, pause, resume, slowDown, speedUp } from "./action/speed_command";
import { IStoreProps } from "./reducer";

interface IMenuOwnProps {
    gameWrapper: { game: Game };
}

interface IMenuStateProps {
    isPaused: boolean;
}

interface IMenuDispatchProps {
    createImportExport: () => void;
    createTutorial: () => void;
    pause: () => void;
    resume: () => void;
    slowDown: () => void;
    speedUp: () => void;
}

type MenuProps = IMenuOwnProps & IMenuStateProps & IMenuDispatchProps;

class Menu extends React.PureComponent<MenuProps> {

    public render() {
        const game = this.props.gameWrapper;
        const galaxy = game.game.getReader();
        const money = galaxy.getMoney();
        const numColonists = galaxy.getNumColonists();
        const numTraders = galaxy.getNumUnusedTraders();
        const day = galaxy.getDay();
        const year = galaxy.getYear();

        const [pauseTitle, pauseText] = this.props.isPaused ?
            ["Resume", "play_arrow"] :
            ["Pause", "pause"];

        return <div id="menu">
            <div id="stats">
                <div title="The score is an indicator of how well your industrial empire performs. It is the average profit up to now, less your starting capital ((profit - starting cash)/time).">Score: {galaxy.getScore()}</div>
                <div title="This is the cash reserve of your industrial empire. A negative cash reserve means loans with a 10% annual interest rate, compounded daily.">Cash: ${money.toFixed(2)}</div>
                <div title="Colonists are gained through population growth from planets that encourage colonist (checkbox). One colonist is needed to colonize a new planet.">Colonist: {numColonists.toFixed(2)}</div>
                <div title="Invest $10000 in a new trader. Traders transport goods between planets on the trade network.">Trader: {numTraders.toFixed(2)}<button onClick={this.addTrader}><i className="material-icons">add</i></button></div>
                <div>Day {day}, Year {year}</div>
            </div>
            <div>
                <button
                    title="Import/Export save"
                    onClick={this.props.createImportExport}
                >
                    <i className="material-icons">import_export</i>
                </button>
                <button
                    title="Save game"
                    onClick={this.save}
                >
                    <i className="material-icons">save</i>
                </button>
                <button
                    title="Slow down game speed"
                    onClick={this.props.slowDown}
                >
                    <i className="material-icons">fast_rewind</i>
                </button>
                <button
                    onClick={this.pauseResumeGame}
                    title={pauseTitle}
                >
                    <i className="material-icons">{pauseText}</i>
                </button>
                <button
                    title="Increase game speed"
                    onClick={this.props.speedUp}
                >
                    <i className="material-icons">fast_forward</i>
                </button>
                <button
                    title="Open tutorial"
                    onClick={this.props.createTutorial}
                >
                    <i className="material-icons">help_outline</i>
                </button>
            </div>
        </div>;
    }

    private addTrader = (e: React.MouseEvent<HTMLButtonElement>) => {
        const isOk = e.ctrlKey || confirm(`Are you sure? This action costs $${Model.TRADER_COST}. (press ctrl while clicking the button suppresses this message)`);
        if (isOk) {
            const game = this.props.gameWrapper.game;
            const galaxy = game.getWriter();
            galaxy.addTrader();
            galaxy.withdraw(Model.TRADER_COST);
        }
    }

    private pauseResumeGame = () => {
        if (this.props.isPaused) {
            this.props.resume();
        } else {
            this.props.pause();
        }
    }

    private save = () => {
        this.props.gameWrapper.game.save();
    }
}

const mapStatesToProps = (state: IStoreProps): IMenuStateProps => ({
    isPaused: state.speedCommand.isPaused,
});

const dispatchers = (dispatch: Dispatch<ClosableAction | ISpeedCommandAction>): IMenuDispatchProps => ({
    createImportExport: () => dispatch(addClosable(ClosablePanelType.ImportExport)),
    createTutorial: () => dispatch(addClosable(ClosablePanelType.Tutorial)),
    pause: () => dispatch(pause()),
    resume: () => dispatch(resume()),
    slowDown: () => dispatch(slowDown()),
    speedUp: () => dispatch(speedUp()),
});

export default connect(mapStatesToProps, dispatchers)(Menu);
