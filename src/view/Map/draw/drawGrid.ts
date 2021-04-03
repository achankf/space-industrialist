import { SortedTrie } from "myalgo-ts";

import { GalaxyReadProxy } from "../../../game";
import { Colony } from "../../../model/colony";
import { colonyCmp } from "../../../model/galaxy";
import CoorCalculator from "../CoorCalculator";
import { MapUIState } from "../reducer/state";

export default function drawGrid(
  canvas: HTMLCanvasElement,
  galaxy: GalaxyReadProxy,
  state: MapUIState
): HTMLCanvasElement {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("cannot create context");
  }
  const { topLeft, gridSize } = state;
  const coorCalculator = new CoorCalculator(state);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#494949";

  // draw all horizontal lines
  const startX = (((topLeft[0] * gridSize) % gridSize) + gridSize) % gridSize;
  for (let curX = 0; curX <= canvas.width; curX += gridSize) {
    const curX2 = Math.ceil(curX + startX);
    ctx.beginPath();
    ctx.moveTo(curX2 + 0.5, 0.5);
    ctx.lineTo(curX2 + 0.5, canvas.height + 0.5);
    ctx.stroke();
  }

  // draw all vertical lines
  const startY = (((topLeft[1] * gridSize) % gridSize) + gridSize) % gridSize;
  for (let curY = 0; curY <= canvas.height; curY += gridSize) {
    const curY2 = Math.ceil(curY + startY);
    ctx.beginPath();
    ctx.moveTo(0.5, curY2 + 0.5);
    ctx.lineTo(canvas.width + 0.5, curY2 + 0.5);
    ctx.stroke();
  }

  ctx.restore();

  drawTradeRoutes(galaxy, coorCalculator, canvas, ctx);
  return canvas;
}

function drawTradeRoutes(
  galaxy: GalaxyReadProxy,
  coor: CoorCalculator,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
) {
  const tradeRoutes = galaxy.getTradeRoutes();

  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "cyan";

  const drawn = new SortedTrie<Colony, [Colony, Colony], true>(colonyCmp);

  for (const [u, vs] of tradeRoutes) {
    for (const v of vs) {
      const edge: [Colony, Colony] = [u, v];
      if (drawn.has(edge)) {
        continue;
      }
      drawn.set(edge, true);

      const [ux, uy] = coor.toVpCoor(galaxy.getCoor(u));
      const [vx, vy] = coor.toVpCoor(galaxy.getCoor(v));
      ctx.beginPath();
      ctx.moveTo(ux, uy);
      ctx.lineTo(vx, vy);
      ctx.stroke();
    }
  }
  ctx.restore();

  return canvas;
}
