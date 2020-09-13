import * as Hammer from "hammerjs";
import * as Immutable from "immutable";
import { SortedTrie, add, norm, project, subtract, Vec2D } from "myalgo-ts";
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { GameContext } from "../contexts/GameContext";
import { ViewContext } from "../contexts/ViewContext";
import { CoorT, IRouteSegment, MapDataKind } from "../model";
import { Colony } from "../model/colony";
import { Fleet as FleetModel } from "../model/fleet";
import { colonyCmp } from "../model/galaxy";
import { Planet as PlanetModel } from "../model/planet";
import { Product, RawMaterial } from "../model/product";
import assert from "../utils/assert";
import { ViewKind } from "./constants/view";

const MIN_GRID_SIZE = 50;
const MAX_GRID_SIZE = 300;
const RADIUS = 3 / 10;

let gridSize = MIN_GRID_SIZE;
function setGridSize(value: number) {
  gridSize = value;
}

let topLeft: Vec2D = [0, 0];
function setTopLeft(value: Vec2D) {
  topLeft = value;
}

let cachedGrid = document.createElement("canvas");
function setCachedGrid(value: HTMLCanvasElement) {
  cachedGrid = value;
}

let updateAnimation: (() => void) | undefined = undefined;
function setUpdateAnimation(value: (() => void) | undefined) {
  updateAnimation = value;
}

const Map: React.FC = () => {
  const { game, gameUpdateFlag } = useContext(GameContext);
  const { setCurrentView } = useContext(ViewContext);
  const galaxy = game.getReader();

  // somehow hooks don't persist outside of rendering
  //TODO find a way to put the global variables into scope

  // const [topLeft, setTopLeft] = useState(game.getReader().calCenter());
  // const [gridSize, setGridSize] = useState(MIN_GRID_SIZE);
  // const [cachedGrid, setCachedGrid] = useState(
  //   document.createElement("canvas")
  // );
  // const [updateAnimation, setUpdateAnimation] = useState<
  //   (() => void) | undefined
  // >(undefined);
  const [isNewAnimationFrame, triggerNewAnimationFrame] = useState({});

  // setup global variables
  useEffect(() => {
    topLeft = game.getReader().calCenter();
  }, []);

  // setup event handlers and the infinite event loop
  useEffect(() => {
    const canvas = getMapCanvas();

    const gesture = new Hammer.Manager(canvas);
    const double = new Hammer.Tap({ event: "doubletap", taps: 2 });
    const single = new Hammer.Tap({ event: "singletap" });
    const panRecognizer = new Hammer.Pan().set({
      direction: Hammer.DIRECTION_ALL,
    });
    gesture.add([new Hammer.Pinch(), double, single, panRecognizer]);
    double.recognizeWith(single);
    single.requireFailure(double);

    // setup events
    gesture.on("singletap", click);
    gesture.on("doubletap", dblclick);
    gesture.on("pinch", wheel);
    gesture.on("pan", pan);

    // mouse wheel event handled separately
    canvas.addEventListener("wheel", wheel);

    const resize = () => {
      const width = document.body.clientWidth;
      const height = document.body.clientHeight;
      canvas.width = width;
      canvas.height = height;
      cachedGrid.width = width;
      cachedGrid.height = height;
      setCachedGrid(drawGrid());
    };

    window.addEventListener("resize", resize);

    resize();

    function repeat() {
      triggerNewAnimationFrame({});
      requestAnimationFrame(repeat);
    }
    repeat();
  }, []);

  // update cached grid whenver game is mutated
  useEffect(() => {
    setCachedGrid(drawGrid());
  }, [gameUpdateFlag]);

  // event loop
  useEffect(() => {
    draw();
  }, [isNewAnimationFrame]);

  return <Canvas id="map" />;

  // end of component
  // below are helper functions for drawing the map

  function draw() {
    if (updateAnimation !== undefined) {
      updateAnimation();
      setCachedGrid(drawGrid());
    }

    const canvas = getMapCanvas();
    // draw the map
    const width = document.body.clientWidth;
    const height = document.body.clientHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("cannot create 2D graphics context");
    }
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(cachedGrid, 0, 0);
    ctx.drawImage(drawObjects(), 0, 0);
  }

  function drawObjects() {
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
        const [vpX, vpY] = toVpCoor(coor);

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
          const [vpX, vpY] = toVpCoor(coor);
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
        const [vpX, vpY] = toVpCoor(coor);
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
          const [vpX, vpY] = toVpCoor(coor);
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

  function drawGrid() {
    const canvas = cachedGrid;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("cannot create context");
    }

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

    drawTradeRoutes(canvas, ctx);
    return canvas;
  }

  function drawTradeRoutes(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ) {
    const galaxy = game.getReader();
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

        const [ux, uy] = toVpCoor(galaxy.getCoor(u));
        const [vx, vy] = toVpCoor(galaxy.getCoor(v));
        ctx.beginPath();
        ctx.moveTo(ux, uy);
        ctx.lineTo(vx, vy);
        ctx.stroke();
      }
    }
    ctx.restore();

    return canvas;
  }

  function panTo(vpFrom: [number, number], vpTo: [number, number]) {
    setUpdateAnimation(undefined);

    const from = toGameCoor(vpFrom);
    const to = toGameCoor(vpTo);
    const offset = subtract(from, to);
    let distance = norm(offset);

    setUpdateAnimation(() => {
      const speed = distance * 0.02;
      let final;
      if (speed === 0) {
        return; // no change
      }

      if (speed < 0.01 / gridSize) {
        setUpdateAnimation(undefined);
        final = distance;
      } else {
        final = speed;
        distance -= speed;
      }
      const proj = project(offset, final);
      setTopLeft(add(topLeft, proj));
    });
  }

  function pan(e: HammerInput) {
    const vpCenter = getVpCenter();
    panTo(vpCenter, add(vpCenter, [e.deltaX, e.deltaY]));
  }

  function click(e: HammerInput) {
    const galaxy = game.getReader();
    e.target;
    const bb = e.target.getBoundingClientRect();
    const coor: [number, number] = [e.center.x - bb.left, e.center.y - bb.top];
    const gameCoor = toGameCoor(coor);

    const nearbyObjs = galaxy.searchNearbyObjs(gameCoor, RADIUS).toArray();
    switch (nearbyObjs.length) {
      case 0:
        break;
      case 1: {
        const obj = nearbyObjs[0];
        switch (obj.kind) {
          case MapDataKind.Fleet:
            setCurrentView({ kind: ViewKind.Fleet, fleet: obj as FleetModel });
            break;
          case MapDataKind.Planet:
            setCurrentView({
              kind: ViewKind.Planet,
              planet: obj as PlanetModel,
            });
            break;
          case MapDataKind.RouteSegment:
            setCurrentView({
              kind: ViewKind.Route,
              route: obj as IRouteSegment,
            });
            break;
        }
        break;
      }
      default: {
        setCurrentView({ kind: ViewKind.Selector, objs: nearbyObjs });
        break;
      }
    }
  }

  function dblclick(e: HammerInput) {
    const bb = e.target.getBoundingClientRect();
    const coor = [e.center.x - bb.left, e.center.y - bb.top] as [
      number,
      number
    ];
    panTo(getVpCenter(), coor);
  }

  function wheel(e: WheelEvent | HammerInput) {
    setUpdateAnimation(undefined);

    const isZoomingIn = e.deltaY < 0;
    const centerCoor = getCenter();
    let zoomSpeed = 10;
    setUpdateAnimation(() => {
      if (isZoomingIn) {
        setGridSize(Math.min(MAX_GRID_SIZE, gridSize + zoomSpeed));
      } else {
        setGridSize(Math.max(MIN_GRID_SIZE, gridSize - zoomSpeed));
      }
      setTopLeft(centerVp(toVpCoor(centerCoor)));

      if (updateAnimation !== undefined) {
        zoomSpeed /= 1.1;
        if (zoomSpeed < 1) {
          setUpdateAnimation(undefined);
        }
      }
    });
  }

  function centerVp(vpAt: [number, number]) {
    const at = toGameCoor(vpAt);
    const offset = subtract(getCenter(), at);
    return add(topLeft, offset);
  }

  function toVpCoor([x, y]: [number, number]): Vec2D {
    const [tlX, tlY] = topLeft;
    return [(x + tlX) * gridSize, (y + tlY) * gridSize];
  }

  function toGameCoor([x, y]: [number, number]): Vec2D {
    const [tlX, tlY] = topLeft;
    return [x / gridSize - tlX, y / gridSize - tlY];
  }

  function getVpCenter(): Vec2D {
    const canvas = getMapCanvas();
    return [canvas.width / 2, canvas.height / 2];
  }

  function getCenter() {
    return toGameCoor(getVpCenter());
  }
};

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
) {
  ctx.arc(x, y, r, 0, 2 * Math.PI);
}

function drawTriangle(ctx: CanvasRenderingContext2D) {
  ctx.moveTo(0, 0);
  ctx.lineTo(5, 20);
  ctx.lineTo(-5, 20);
  ctx.closePath();
}

// Ref hooks doesn't work since the reference needs to last outside of rendering
function getMapCanvas() {
  const canvas = document.getElementsByTagName("canvas").namedItem("map");
  if (!canvas) {
    throw new Error("map canvas not setup properly");
  }
  return canvas;
}

const Canvas = styled.canvas`
  grid-column: 1;
  grid-row: 2;
  width: 100%;
  height: 100%;
`;

export default Map;
