import { norm, subtract, Vec2D } from "myalgo-ts";

import CoorCalculator from "../CoorCalculator";

export enum ActionKind {
  Zoom,
  Pan,
}

export interface PanAction {
  kind: ActionKind.Pan;
  distance: number;
  offset: Vec2D;
}

export interface ZoomAction {
  kind: ActionKind.Zoom;
  center: Vec2D;
  speed: number;
  isZoomingIn: boolean;
}

export type AnimationAction = ZoomAction | PanAction;

export function createPanAction(
  coorCalculator: CoorCalculator,
  vpFrom: Vec2D,
  vpTo: Vec2D
): PanAction {
  const from = coorCalculator.toGameCoor(vpFrom);
  const to = coorCalculator.toGameCoor(vpTo);
  const offset = subtract(from, to);
  const distance = norm(offset);
  return { kind: ActionKind.Pan, distance, offset };
}

export function createZoomAction(
  center: Vec2D,
  isZoomingIn: boolean
): ZoomAction {
  return { kind: ActionKind.Zoom, center, speed: 10, isZoomingIn };
}
