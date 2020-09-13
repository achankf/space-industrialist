import * as React from "react";
import { render } from "react-dom";
import { Game } from "./game";
import { GameContextProvider } from "./contexts/GameContext";
import App from "./App";
import { ViewContextProvider } from "./contexts/ViewContext";
import { SpeedContextProvider } from "./contexts/SpeedContext";
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
