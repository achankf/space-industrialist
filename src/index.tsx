import * as React from "react";
import { render } from "react-dom";
import { Game } from "./game";
import "./index.css";
import { GameContextProvider } from "./contexts/GameContext";
import App from "./App";
import { ViewContextProvider } from "./contexts/ViewContext";
import { SpeedContextProvider } from "./contexts/SpeedContext";

Game.tryLoad().then(({ game, isNewGame }) => {
  render(
    <ViewContextProvider isNewGame={isNewGame}>
      <SpeedContextProvider>
        <GameContextProvider game={game}>
          <App />
        </GameContextProvider>
      </SpeedContextProvider>
    </ViewContextProvider>,
    document.getElementById("root")
  );
});
