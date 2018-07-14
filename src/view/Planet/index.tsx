import * as React from "react";
import { Planet } from "../../model/planet";
import ContentPanel from "../ContentPanel";
import TitleBar from "../TitleBar";
import Window from "../Window";
import { Game } from "./../../game";
import Industry from "./Industry";
import Info from "./Info";
import Market from "./Market";

enum CurrentViewType {
    Industry,
    Info,
    Market,
}

interface IPlanetProps {
    game: Game;
    planet: Planet;
}

type PlanetProps = IPlanetProps;

interface IPlanetState {
    currentViewType: CurrentViewType;
}

export default class PlanetView extends React.Component<PlanetProps, IPlanetState> {

    public readonly view = document.createElement("div");

    public state = { currentViewType: CurrentViewType.Info };

    public render() {
        const planet = this.props.planet;
        const isColonized = planet.isColonized();

        return <Window>
            <TitleBar title={`Planet ${planet.id}`} />
            {
                isColonized ?
                    <nav className="tabs">
                        <div onClick={this.switchToInfo}>Planet</div>
                        <div onClick={this.switchToMarket}>Market</div>
                        <div onClick={this.switchToIndustry}>Industry</div>
                    </nav> :
                    undefined
            }
            <ContentPanel>
                {this.getCurrentView()}
            </ContentPanel>
        </Window>;
    }

    private switchToInfo = () => this.setState({ currentViewType: CurrentViewType.Info });

    private switchToMarket = () => this.setState({ currentViewType: CurrentViewType.Market });

    private switchToIndustry = () => this.setState({ currentViewType: CurrentViewType.Industry });

    private getCurrentView() {

        const game = this.props.game;
        const planet = this.props.planet;

        if (planet.isColonized()) {
            const colony = planet.getColony()!;
            switch (this.state.currentViewType) {
                case CurrentViewType.Market:
                    // only colonized planets have markets
                    console.assert(colony !== undefined);
                    return <Market game={game} colony={colony} />;
                case CurrentViewType.Info:
                    return <Info game={game} planet={planet} />;
                case CurrentViewType.Industry:
                    // only colonized planets have industries
                    console.assert(colony !== undefined);
                    return <Industry gameWrapper={{ game }} colony={colony} />;
                default:
                    throw new Error("not handled");
            }
        }

        // this happens when a uncolonized planet is select after a planet view is openned
        return <Info game={game} planet={planet} />;
    }
}
