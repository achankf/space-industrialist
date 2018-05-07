import * as React from "react";
import { connect } from "react-redux";
import { Game } from "../../../game";
import * as Model from "../../../model";
import { close } from "../../action/closable_action";
import DestinationTable from "./DestinationTable";

interface IRouteProps {
    gameWrapper: { game: Game };
    fleet: Model.Fleet;
}

interface IRouteDispatchProps {
    closePanel: () => void;
}

type RouteProps = IRouteProps & IRouteDispatchProps;

export class Route extends React.PureComponent<RouteProps> {

    public render() {
        const game = this.props.gameWrapper.game;
        const galaxy = game.getReader();
        const fleet = this.props.fleet;
        const speed = galaxy.getFleetSpeed(fleet).toFixed(2);

        return <div>
            <fieldset title="This table shows a list of places that the trader is going to trader. Dest means the trader is heading towards that place.">
                <legend>General</legend>
                <div title="The speed indicates how far the trader is going to move per day.">Speed: {speed}</div>
                <button
                    disabled={galaxy.isRetired(fleet)}
                    onClick={this.retireFleet}
                    title="The trader will return to the trader pool and to be reassigned."
                >Retire trader
         </button>
            </fieldset>
            <fieldset title="This table shows a list of places that the trader is going to trader. Dest means the trader is heading towards that place.">
                <legend>Route</legend>
                <DestinationTable fleet={fleet} game={game} />
            </fieldset>
        </div>;
    }

    private retireFleet = () => {
        const game = this.props.gameWrapper.game;
        const galaxy = game.getWriter();
        const fleet = this.props.fleet;
        galaxy.retire(fleet);
        this.props.closePanel();
    }
}

export default connect<{}, IRouteDispatchProps, IRouteProps>(
    undefined,
    (dispatch) => ({
        closePanel: () => dispatch(close()),
    }),
)(Route);
