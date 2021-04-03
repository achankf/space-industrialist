import * as Immutable from "immutable";

import { GalaxyReadProxy } from "../../../game";
import { CoorT, MapDataKind } from "../../../model";
import { Fleet as FleetModel } from "../../../model/fleet";
import { Planet as PlanetModel } from "../../../model/planet";
import { Product, RawMaterial } from "../../../model/product";
import assert from "../../../utils/assert";
import { RADIUS } from "../constants";
import CoorCalculator from "../CoorCalculator";
import { MapUIState } from "../reducer/state";

export default function drawObjects(
  galaxy: GalaxyReadProxy,
  coorCalculator: CoorCalculator,
  state: MapUIState
): HTMLCanvasElement {
  const { gridSize } = state;
  const [canvas, ctx] = createBlankCanvas();
  canvas.width = document.body.clientWidth;
  canvas.height = document.body.clientHeight;

  const groups = Immutable.Seq(galaxy.getObjs()).groupBy(([x]) => x.kind);

  const drawFleets = () => {
    const fleetGroup = groups.get(MapDataKind.Fleet);
    if (!fleetGroup) {
      return;
    }
    const fleets = fleetGroup.values();

    ctx.save();
    ctx.fillStyle = "yellow";
    ctx.strokeStyle = "yellow";
    for (const [obj, coor] of fleets) {
      const [vpX, vpY] = coorCalculator.toVpCoor(coor);

      const fleet = obj as FleetModel;
      const angle = galaxy.getAngle(fleet);
      ctx.save();
      ctx.beginPath();
      ctx.translate(vpX, vpY);
      ctx.rotate(angle);
      ctx.scale(0.5, 0.5);
      drawTriangle(ctx);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  };

  const drawPlanets = () => {
    const planetGroup = groups.get(MapDataKind.Planet);
    if (!planetGroup) {
      throw new Error("game generation should generate at least 1 planet");
    }
    const planetArray = Array.from(planetGroup.values()) as Array<
      [PlanetModel, CoorT]
    >;
    const allPlanets = Immutable.Seq(planetArray).groupBy(
      ([x]) => (x as PlanetModel).resource
    );

    ctx.save();

    // draw planet symbols (colored circles)
    ctx.fillStyle = "yellow";
    ctx.strokeStyle = "yellow";
    const radius = RADIUS * gridSize;

    const drawPlanetCircle = (color: string, resource: RawMaterial) => {
      const planetByResource = allPlanets.get(resource);
      if (!planetByResource) {
        assert(
          false,
          "all planets should be distributed about evenly in terms of raw material types"
        ); // TODO validate this
        return;
      }
      const planets = planetByResource.values();
      ctx.fillStyle = color;
      for (const [, coor] of planets) {
        const [vpX, vpY] = coorCalculator.toVpCoor(coor);
        ctx.beginPath();
        drawCircle(ctx, vpX, vpY, radius);
        ctx.fill();
      }
    };

    drawPlanetCircle("green", Product.Crop);
    drawPlanetCircle("brown", Product.Metal);
    drawPlanetCircle("darkcyan", Product.Gem);
    drawPlanetCircle("orange", Product.Fuel);
    ctx.restore();

    // draw ids
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = Math.ceil(RADIUS * gridSize);
    ctx.font = `${fontSize}px sans-serif`;
    for (const [planet, coor] of planetArray) {
      const [vpX, vpY] = coorCalculator.toVpCoor(coor);
      ctx.beginPath();
      ctx.fillText(`${planet.id}`, vpX, vpY);
    }
    ctx.restore();

    // draw colony indicators
    ctx.strokeStyle = "purple";
    ctx.lineWidth = 2;
    for (const [planet, coor] of planetArray) {
      if (planet.tryGetColony() !== undefined) {
        ctx.beginPath();
        const [vpX, vpY] = coorCalculator.toVpCoor(coor);
        drawCircle(ctx, vpX, vpY, radius);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  drawPlanets();
  drawFleets();

  return canvas;
}

function createBlankCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("cannot create context");
  }
  return [canvas, context];
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number
): void {
  ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function drawTriangle(ctx: CanvasRenderingContext2D): void {
  ctx.moveTo(0, 0);
  ctx.lineTo(5, 20);
  ctx.lineTo(-5, 20);
  ctx.closePath();
}
