import React, { useState } from "react";

import noOp from "../utils/noOp";

const FREQUENCY_RATE = 20;

function upFrequency(oldPeriod: number) {
  return Math.max(FREQUENCY_RATE, oldPeriod - FREQUENCY_RATE);
}

function downFrequency(oldPeriod: number) {
  return Math.min(100, oldPeriod + FREQUENCY_RATE);
}

export interface SpeedContextType {
  period: number;
  isPaused: boolean;
  togglePause(): void;
  speedUp(): void;
  slowDown(): void;
}

export const SpeedContext = React.createContext<SpeedContextType>({
  period: 0,
  isPaused: false,
  togglePause: noOp,
  speedUp: noOp,
  slowDown: noOp,
});

export const SpeedContextProvider: React.FC = ({ children }) => {
  const [period, setPeriod] = useState(50);
  const [isPaused, setPause] = useState(true);

  function togglePause() {
    setPause(!isPaused);
  }
  function speedUp() {
    setPeriod(upFrequency(period));
  }
  function slowDown() {
    setPeriod(downFrequency(period));
  }

  return (
    <SpeedContext.Provider
      value={{ period, isPaused, togglePause, speedUp, slowDown }}
    >
      {children}
    </SpeedContext.Provider>
  );
};
