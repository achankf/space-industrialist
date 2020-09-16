import { Reducer } from "react";
import Bug from "../../../utils/UnreachableError";
import { AnimationAction, ActionKind } from "./action";
import panReducer from "./panReducer";
import { MapUIState } from "./state";
import zoomReducer from "./zoomReducer";

const reducer: Reducer<MapUIState, AnimationAction> = (prevState, action) => {
  switch (action.kind) {
    case ActionKind.Pan:
      return panReducer(prevState, action);
    case ActionKind.Zoom:
      return zoomReducer(prevState, action);
    default:
      throw new Bug();
  }
};

export default reducer;
