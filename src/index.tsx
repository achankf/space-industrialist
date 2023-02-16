import * as React from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { GameContextProvider } from "./contexts/GameContext";
import { SpeedContextProvider } from "./contexts/SpeedContext";
import { ViewContextProvider } from "./contexts/ViewContext";
import { Game } from "./game";
import { GlobalStyle } from "./GlobalStyle";

Game.tryLoad().then(({ game, isNewGame }) => {
  const container = document.getElementById("root");

  if (!container) {
    throw new Error("HTML file doesn't contain a root div");
  }

  const root = createRoot(container); // createRoot(container!) if you use TypeScript
  root.render(
    <ViewContextProvider isNewGame={isNewGame}>
      <SpeedContextProvider>
        <GameContextProvider game={game}>
          <GlobalStyle />
          <App />
        </GameContextProvider>
      </SpeedContextProvider>
    </ViewContextProvider>
  );
});
