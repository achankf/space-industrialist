import { Vec2D } from "myalgo-ts";

import { MIN_GRID_SIZE } from "../constants";
import { AnimationAction } from "./action";

export interface MapUIState {
  gridSize: number;
  topLeft: Vec2D;
  cachedGrid: HTMLCanvasElement;
  animationAction?: AnimationAction;
}

export const defaultState: MapUIState = {
  gridSize: MIN_GRID_SIZE,
  topLeft: [0, 0],
  cachedGrid: document.createElement("canvas"),
};
