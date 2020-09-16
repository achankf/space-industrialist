import React, { useState } from "react";
import noOp from "../utils/noOp";
import { AllBaseViewProps, ViewProps } from "../view/ViewProps";
import { ViewKind } from "../view/constants/view";
import assert from "../utils/assert";

export interface ViewContextType {
  currentView?: ViewProps;
  setCurrentView(props: AllBaseViewProps): void;
  closeView(id: symbol): void;
}

export const ViewContext = React.createContext<ViewContextType>({
  currentView: undefined,
  setCurrentView: noOp,
  closeView: noOp,
});

interface ContextProviderProps {
  isNewGame: boolean;
}

export const ViewContextProvider: React.FC<ContextProviderProps> = ({
  children,
  isNewGame,
}) => {
  const [currentView, setCurrentViewBase] = useState<ViewProps | undefined>(
    isNewGame
      ? { kind: ViewKind.Tutorial, viewId: Symbol(Date.now()) }
      : undefined
  );

  function setCurrentView(props: AllBaseViewProps) {
    setCurrentViewBase({ ...props, viewId: Symbol(Date.now()) });
  }

  function closeView(id: symbol) {
    assert(!!currentView && currentView.viewId === id);
    setCurrentViewBase(undefined);
  }

  return (
    <ViewContext.Provider value={{ closeView, currentView, setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
};
