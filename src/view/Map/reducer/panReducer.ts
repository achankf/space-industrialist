import { add, project } from "myalgo-ts";
import { Reducer } from "react";
import { PanAction } from "./action";
import { MapUIState } from "./state";

const panReducer: Reducer<MapUIState, PanAction> = (prevState, action) => {
  const { gridSize, topLeft } = prevState;
  const { distance, offset } = action;
  const speed = distance * 0.02;
  if (speed === 0) {
    return { ...prevState, animationAction: undefined }; // no change
  }

  const { moveDistance, action: nextAction } =
    speed < 0.01 / gridSize
      ? { action: undefined, moveDistance: distance }
      : {
          action: { ...action, distance: distance - speed },
          moveDistance: speed,
        };

  const proj = project(offset, moveDistance);
  return {
    ...prevState,
    topLeft: add(topLeft, proj),
    animationAction: nextAction,
  };
};

export default panReducer;
