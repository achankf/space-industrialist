import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "../../node_modules/redux";
import { Game } from "../game";
import { IMapData, IRouteSegment, MapDataKind } from "../model";
import { Fleet as FleetModel } from "../model/fleet";
import { Planet as PlanetModel } from "../model/planet";
import { addClosable, ClosableAction, ClosableArgs, ClosablePanelType } from "./action/closable_action";
import ContentPanel from "./ContentPanel";
import { routeString } from "./Route";
import TitleBar from "./TitleBar";
import Window from "./Window";

interface ISelectorProps {
    game: Game;
    objs: IMapData[];
}

interface ISelectorDispatchProps {
    addClosable: (type: ClosablePanelType, args: ClosableArgs) => void;
}

type SelectorProps = ISelectorProps & ISelectorDispatchProps;

class Selector extends React.PureComponent<SelectorProps> {

    public readonly view = document.createElement("div");

    constructor(props: SelectorProps) {
        super(props);
        console.assert(props.objs.length > 0);
    }

    public render() {
        const game = this.props.game;
        const allLabels = this.props.objs
            .map((obj) => {
                let label: string;
                let color: string;
                let click: () => void;

                switch (obj.kind) {
                    case MapDataKind.Fleet:
                        {
                            const fleet = obj as FleetModel;
                            label = `Trader ${fleet.id}`;
                            color = "yellow";
                            click = () => this.props.addClosable(ClosablePanelType.Fleet, fleet);
                        }
                        break;
                    case MapDataKind.Planet:
                        {
                            const planet = obj as PlanetModel;
                            label = `Planet ${planet.id}`;
                            color = "green";
                            click = () => this.props.addClosable(ClosablePanelType.Planet, planet);
                        }
                        break;
                    case MapDataKind.RouteSegment:
                        {
                            const route = obj as IRouteSegment;
                            label = `${routeString(game, route)}`;
                            color = "darkcyan";
                            click = () => this.props.addClosable(ClosablePanelType.Route, route);
                        }
                        break;
                    default:
                        throw new Error("unhandled");
                }

                return <div
                    className="selectLabel"
                    key={label}
                    style={{ color }}
                    onClick={click}
                >
                    {label}
                </div>;
            });

        return <Window>
            <TitleBar title="Which One?" />
            <ContentPanel>
                {allLabels}
            </ContentPanel>
        </Window>;
    }
}

const dispatchers = (dispatch: Dispatch<ClosableAction>): ISelectorDispatchProps => ({
    addClosable: (type: ClosablePanelType, args: ClosableArgs) => dispatch(addClosable(type, args)),
});

export default connect(null, dispatchers)(Selector);
