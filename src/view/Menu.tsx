import React, { useContext } from "react";
import { GameContext } from "../contexts/GameContext";
import { SpeedContext } from "../contexts/SpeedContext";
import { ViewContext } from "../contexts/ViewContext";
import { TRADER_COST } from "../model";
import { ViewKind } from "./constants/view";

const Menu: React.FC = () => {
  const { game } = useContext(GameContext);
  const { setCurrentView } = useContext(ViewContext);
  const { isPaused, speedUp, slowDown, togglePause } = useContext(SpeedContext);
  const galaxy = game.getReader();
  const money = galaxy.getMoney();
  const numColonists = galaxy.getNumColonists();
  const numTraders = galaxy.getNumUnusedTraders();
  const day = galaxy.getDay();
  const year = galaxy.getYear();

  const [pauseTitle, pauseText] = isPaused
    ? ["Resume", "play_arrow"]
    : ["Pause", "pause"];

  function addTrader(e: React.MouseEvent<unknown>) {
    const isOk =
      e.ctrlKey ||
      window.confirm(
        `Are you sure? This action costs $${TRADER_COST}. (press ctrl while clicking the button suppresses this message)`
      );
    if (isOk) {
      const galaxy = game.getWriter();
      galaxy.addTrader();
      galaxy.withdraw(TRADER_COST);
    }
  }

  return (
    <div id="menu">
      <div id="stats">
        <div title="The score is an indicator of how well your industrial empire performs. It is the average profit up to now, less your starting capital ((profit - starting cash)/time).">
          Score: {galaxy.getScore()}
        </div>
        <div title="This is the cash reserve of your industrial empire. A negative cash reserve means loans with a 10% annual interest rate, compounded daily.">
          Cash: ${money.toFixed(2)}
        </div>
        <div title="Colonists are gained through population growth from planets that encourage colonist (checkbox). One colonist is needed to colonize a new planet.">
          Colonist: {numColonists.toFixed(2)}
        </div>
        <div title="Invest $10000 in a new trader. Traders transport goods between planets on the trade network.">
          Trader: {numTraders.toFixed(2)}
          <button onClick={addTrader}>
            <i className="material-icons">add</i>
          </button>
        </div>
        <div>
          Day {day}, Year {year}
        </div>
      </div>
      <div>
        <button
          title="Import/Export save"
          onClick={() => setCurrentView({ kind: ViewKind.ImportExport })}
        >
          <i className="material-icons">import_export</i>
        </button>
        <button title="Save game" onClick={() => game.save()}>
          <i className="material-icons">save</i>
        </button>
        <button title="Slow down game speed" onClick={slowDown}>
          <i className="material-icons">fast_rewind</i>
        </button>
        <button onClick={togglePause} title={pauseTitle}>
          <i className="material-icons">{pauseText}</i>
        </button>
        <button title="Increase game speed" onClick={speedUp}>
          <i className="material-icons">fast_forward</i>
        </button>
        <button
          title="Open tutorial"
          onClick={() => setCurrentView({ kind: ViewKind.Tutorial })}
        >
          <i className="material-icons">help_outline</i>
        </button>
      </div>
    </div>
  );
};

export default Menu;
