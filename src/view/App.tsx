import * as React from "react";
import { connect } from "react-redux";
import { Game } from "../game";
import { IMapData, IRouteSegment } from "../model";
import { Fleet as FleetModel } from "../model/fleet";
import { Planet as PlanetModel } from "../model/planet";
import { ClosablePanelType } from "./action/closable_action";
import Fleet from "./Fleet";
import ImportExport from "./ImportExport";
import Map from "./Map";
import Menu from "./Menu";
import Planet from "./Planet";
import { IStoreProps } from "./reducer";
import { ClosableState } from "./reducer/closable_action";
import Route from "./Route";
import Selector from "./Selector";
import Tutorial from "./Tutorial";

interface IAppProps {
  game: Game;
  isNewGame: boolean;
}

interface IAppState {
  game: Game;
}

interface IAppDataProps {
  currentViewData: ClosableState;
  isPaused: boolean;
  updatePeriod: number;
}

type AppProps = IAppProps & IAppDataProps;

class App extends React.Component<AppProps, IAppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = { game: props.game };
    this.setupGameLoop();
  }

  public render() {
    const game = this.state.game;
    return (
      <React.Fragment>
        <Menu gameWrapper={{ game }} />
        <Map gameWrapper={{ game }} />
        {this.getCurrentView()}
      </React.Fragment>
    );
  }

  private setupGameLoop() {
    let prevPeriod = this.props.updatePeriod;
    let gameLoopId: number;

    const loop = () => {
      if (!this.props.isPaused) {
        const galaxy = this.props.game.getWriter();
        galaxy.turn();
      }

      const game = this.props.game;
      if (game.isDirty()) {
        this.setState({ game });
        game.resetDirty();
      }

      // update the looping period if changed
      if (this.props.updatePeriod !== prevPeriod) {
        console.log("HIHI");
        window.clearInterval(gameLoopId);
        prevPeriod = this.props.updatePeriod;
      }
      window.setTimeout(loop, prevPeriod);
    };

    // start the loop
    loop();
  }

  private getCurrentView() {
    const game = this.state.game;
    const currentViewData = this.props.currentViewData;

    if (currentViewData !== null) {
      switch (currentViewData.panelType) {
        case ClosablePanelType.ImportExport:
          return <ImportExport game={game} />;
        case ClosablePanelType.Fleet: {
          const fleet = currentViewData.args as FleetModel;
          return <Fleet key={fleet.id} gameWrapper={{ game }} fleet={fleet} />;
        }
        case ClosablePanelType.Planet: {
          const planet = currentViewData.args as PlanetModel;
          return <Planet key={planet.id} game={game} planet={planet} />;
        }
        case ClosablePanelType.Route: {
          const route = currentViewData.args as IRouteSegment;
          return (
            <Route
              key={route.from.toString() + " " + route.to.toString()}
              game={game}
              route={route}
            />
          );
        }
        case ClosablePanelType.Selector: {
          const objs = currentViewData.args as IMapData[];
          return <Selector game={game} objs={objs} />;
        }
        case ClosablePanelType.Tutorial:
          return <Tutorial />;
        default:
          throw new Error("not handled");
      }
    }
    return undefined;
  }
}

const mapStateToProps = (state: IStoreProps): IAppDataProps => ({
  currentViewData: state.closableAction,
  isPaused: state.speedCommand.isPaused,
  updatePeriod: state.speedCommand.period,
});

export default connect(mapStateToProps)(App);
