import { Reducer } from "react";

import { MAX_GRID_SIZE, MIN_GRID_SIZE } from "../constants";
import { CoorCalculator } from "../CoorCalculator";
import { ZoomAction } from "./action";
import { MapUIState } from "./state";

export const zoomReducer: Reducer<MapUIState, ZoomAction> = (
  prevState,
  action
) => {
  const { gridSize } = prevState;
  const { center, isZoomingIn, speed } = action;
  const newGridSize = isZoomingIn
    ? Math.min(MAX_GRID_SIZE, gridSize + speed)
    : Math.max(MIN_GRID_SIZE, gridSize - speed);

  const coorCalculator = new CoorCalculator(prevState);
  const newTopLeft = coorCalculator.centerVp(coorCalculator.toVpCoor(center));

  const newSpeed = speed / 1.1;
  const newAction = speed < 1 ? undefined : { ...action, speed: newSpeed };

  return {
    ...prevState,
    topLeft: newTopLeft,
    gridSize: newGridSize,
    animationAction: newAction,
  };
};
