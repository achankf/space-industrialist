import React, { useContext } from "react";
import styled from "styled-components";
import MaterialIconButton from "../components/MaterialIconButton";
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
    <MenuContainer>
      <StatsPanel>
        <StatsItem title="The score is an indicator of how well your industrial empire performs. It is the average profit up to now, less your starting capital ((profit - starting cash)/time).">
          Score: {galaxy.getScore()}
        </StatsItem>
        <StatsItem title="This is the cash reserve of your industrial empire. A negative cash reserve means loans with a 10% annual interest rate, compounded daily.">
          Cash: ${money.toFixed(2)}
        </StatsItem>
        <StatsItem title="Colonists are gained through population growth from planets that encourage colonist (checkbox). One colonist is needed to colonize a new planet.">
          Colonist: {numColonists.toFixed(2)}
        </StatsItem>
        <StatsItem title="Invest $10000 in a new trader. Traders transport goods between planets on the trade network.">
          Trader: {numTraders.toFixed(2)}
          <MaterialIconButton onClick={addTrader}>add</MaterialIconButton>
        </StatsItem>
        <StatsItem>
          Day {day}, Year {year}
        </StatsItem>
      </StatsPanel>
      <div>
        <MaterialIconButton
          title="Import/Export save"
          onClick={() => setCurrentView({ kind: ViewKind.ImportExport })}
        >
          import_export
        </MaterialIconButton>
        <MaterialIconButton title="Save game" onClick={() => game.save()}>
          save
        </MaterialIconButton>
        <MaterialIconButton title="Slow down game speed" onClick={slowDown}>
          fast_rewind
        </MaterialIconButton>
        <MaterialIconButton onClick={togglePause} title={pauseTitle}>
          {pauseText}
        </MaterialIconButton>
        <MaterialIconButton title="Increase game speed" onClick={speedUp}>
          fast_forward
        </MaterialIconButton>
        <MaterialIconButton
          title="Open tutorial"
          onClick={() => setCurrentView({ kind: ViewKind.Tutorial })}
        >
          help_outline
        </MaterialIconButton>
      </div>
    </MenuContainer>
  );
};

const MenuContainer = styled.div`
  grid-column: 1;
  grid-row: 1;

  background: #555;
  display: flex;
  padding: 5px;
  justify-content: space-between;
  align-items: center;
`;

const StatsPanel = styled.div`
  display: flex;
  flex-direction: row;
  flex-flow: wrap;

  @media (max-width: 500px) {
    flex-direction: column;
  }
`;

const StatsItem = styled.div`
  display: flex;
  align-items: center;
  padding-right: 0.625rem;
`;

export default Menu;
