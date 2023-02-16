import { Reducer } from "react";

import { UnreachableError } from "../../../utils/UnreachableError";
import { ActionKind, AnimationAction } from "./action";
import { panReducer } from "./panReducer";
import { MapUIState } from "./state";
import { zoomReducer } from "./zoomReducer";

export const reducer: Reducer<MapUIState, AnimationAction> = (
  prevState,
  action
) => {
  switch (action.kind) {
    case ActionKind.Pan:
      return panReducer(prevState, action);
    case ActionKind.Zoom:
      return zoomReducer(prevState, action);
    default:
      throw new UnreachableError();
  }
};
