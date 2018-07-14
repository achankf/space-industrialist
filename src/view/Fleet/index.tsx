import * as React from "react";
import { Game } from "../../game";
import { Fleet as FleetModel } from "../../model/fleet";
import ContentPanel from "../ContentPanel";
import TitleBar from "../TitleBar";
import Window from "../Window";
import Cargo from "./Cargo";
import Route from "./Route";

interface IFleetProps {
    gameWrapper: { game: Game };
    fleet: FleetModel;
}

enum CurrentView {
    Cargo,
    Route,
}

interface IFleetState {
    currentView: CurrentView;
}

export default class Fleet extends React.Component<IFleetProps, IFleetState> {

    public state = { currentView: CurrentView.Route };

    public render() {

        const fleet = this.props.fleet;

        return <Window>
            <TitleBar title={`Trader ${fleet.id}`} />
            <ContentPanel>
                <nav className="tabs">
                    <div onClick={this.switchRoutePanel}>Route</div>
                    <div onClick={this.switchCargoPanel}>Cargo</div>
                </nav>
                {this.getCurrentView()}
            </ContentPanel>
        </Window>;
    }

    private getCurrentView() {

        const game = this.props.gameWrapper;
        const fleet = this.props.fleet;

        switch (this.state.currentView) {
            case CurrentView.Route:
                return <Route gameWrapper={game} fleet={fleet} />;
            case CurrentView.Cargo:
                return <Cargo fleet={fleet} />;
        }
    }

    private switchRoutePanel = () => {
        this.setState({ currentView: CurrentView.Route });
    }

    private switchCargoPanel = () => {
        this.setState({ currentView: CurrentView.Cargo });
    }
}
