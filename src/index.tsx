import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";
import { createStore } from "redux";
import { Game } from "./game";
import "./index.css";
import { addClosable, ClosablePanelType } from "./view/action/closable_action";
import App from "./view/App";
import rootReducer from "./view/reducer";

Game.tryLoad().then(({ game, isNewGame }) => {
  const store = createStore(rootReducer);

  if (isNewGame) {
    store.dispatch(addClosable(ClosablePanelType.Tutorial));
  }

  render(
    <Provider store={store}>
      <App game={game} isNewGame={isNewGame} />
    </Provider>,
    document.getElementById("root")
  );
});
