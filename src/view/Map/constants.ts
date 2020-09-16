import Bug from "../../utils/UnreachableError";

export const MIN_GRID_SIZE = 50;
export const MAX_GRID_SIZE = 300;
export const RADIUS = 3 / 10;

export const MAP_CANVAS_ID = "map";

// React.createRef doesn't work since the reference needs to last outside of rendering
export function getMapCanvas(): HTMLCanvasElement {
  const canvas = document
    .getElementsByTagName("canvas")
    .namedItem(MAP_CANVAS_ID);
  if (!canvas) {
    throw new Bug("map canvas not setup properly");
  }
  return canvas;
}
