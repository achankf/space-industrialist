import * as React from "react";
import { render } from "react-dom";

import App from "./App";
import { GameContextProvider } from "./contexts/GameContext";
import { SpeedContextProvider } from "./contexts/SpeedContext";
import { ViewContextProvider } from "./contexts/ViewContext";
import { Game } from "./game";
import GlobalStyle from "./GlobalStyle";

Game.tryLoad().then(({ game, isNewGame }) => {
  render(
    <ViewContextProvider isNewGame={isNewGame}>
      <SpeedContextProvider>
        <GameContextProvider game={game}>
          <GlobalStyle />
          <App />
        </GameContextProvider>
      </SpeedContextProvider>
    </ViewContextProvider>,
    document.getElementById("root")
  );
});
