import { GalaxyReadProxy } from "../../../game";
import { getMapCanvas } from "../constants";
import { CoorCalculator } from "../CoorCalculator";
import { MapUIState } from "../reducer/state";
import { drawObjects } from "./drawObjects";

export function draw(
  galaxy: GalaxyReadProxy,
  state: MapUIState,
  cachedGrid: HTMLCanvasElement
): void {
  const canvas = getMapCanvas();
  const coorCalculator = new CoorCalculator(state);

  // draw the map
  const width = document.body.clientWidth;
  const height = document.body.clientHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("cannot create 2D graphics context");
  }
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(cachedGrid, 0, 0);
  ctx.drawImage(drawObjects(galaxy, coorCalculator, state), 0, 0);
}
