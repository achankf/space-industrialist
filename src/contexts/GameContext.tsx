import React, { useEffect, useState } from "react";

import { Game } from "../game";
import { noOp } from "../utils/noOp";

/**
 * There's no setter since game will be mutated in-place, however,
 * rendering changes are triggered by changing the gameUpdateFlag state.
 */
interface GameContextType {
  game: Game;
  gameUpdateFlag: symbol;
  triggerGameUpdate: () => void;
}

export const GameContext = React.createContext<GameContextType>({
  game: new Game(),
  gameUpdateFlag: Symbol(),
  triggerGameUpdate: noOp,
});

interface ContextProviderProps {
  game: Game;
  children: React.ReactNode;
}

export const GameContextProvider: React.FC<ContextProviderProps> = ({
  children,
  game: initialGame,
}) => {
  const [game] = useState(initialGame);
  const [gameUpdateFlag, triggerGameUpdateBase] = useState(Symbol());

  useEffect(() => {
    game.onChange = triggerGameUpdate;
  }, []);

  function triggerGameUpdate() {
    triggerGameUpdateBase(Symbol(Date.now()));
  }

  return (
    <GameContext.Provider value={{ game, gameUpdateFlag, triggerGameUpdate }}>
      {children}
    </GameContext.Provider>
  );
};
