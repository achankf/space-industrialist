import * as Hammer from "hammerjs";
import { add, Vec2D } from "myalgo-ts";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReducer } from "react";
import styled from "styled-components";
import { GameContext } from "../../contexts/GameContext";
import { ViewContext } from "../../contexts/ViewContext";
import { getMapCanvas, MAP_CANVAS_ID } from "./constants";
import CoorCalculator from "./CoorCalculator";
import draw from "./draw/draw";
import drawGrid from "./draw/drawGrid";
import handleSingleTapHelper from "./events/handleSingleTapHelper";
import { createPanAction, createZoomAction } from "./reducer/action";
import reducer from "./reducer/reducer";
import { defaultState } from "./reducer/state";

const Map: React.FC = () => {
  const { game, gameUpdateFlag } = useContext(GameContext);
  const { setCurrentView } = useContext(ViewContext);
  const galaxy = game.getReader();
  const [mapUIState, dispatch] = useReducer(reducer, defaultState, (init) => ({
    ...init,
    topLeft: game.getReader().calCenter(),
  }));
  const cachedGridRef = useRef(document.createElement("canvas"));
  const hammer = useRef<{ manager?: HammerManager }>({});

  const handleWheel = useCallback<(e: WheelEvent | HammerInput) => void>(
    (e) => {
      const isZoomingIn = e.deltaY < 0;
      const coorCalculator = new CoorCalculator(mapUIState);
      const center = coorCalculator.getCenter();
      const action = createZoomAction(center, isZoomingIn);
      dispatch(action);
    },
    [mapUIState]
  );

  const handleDoubleTap = useCallback<HammerListener>(
    (e) => {
      const bb = e.target.getBoundingClientRect();
      const coorCalculator = new CoorCalculator(mapUIState);
      const coor: Vec2D = [e.center.x - bb.left, e.center.y - bb.top];
      const action = createPanAction(
        coorCalculator,
        coorCalculator.getVpCenter(),
        coor
      );
      dispatch(action);
    },
    [mapUIState]
  );

  const handlePan = useCallback<HammerListener>(
    (e) => {
      const coorCalculator = new CoorCalculator(mapUIState);
      const vpCenter = coorCalculator.getVpCenter();
      const action = createPanAction(
        coorCalculator,
        vpCenter,
        add(vpCenter, [e.deltaX, e.deltaY])
      );
      dispatch(action);
    },
    [mapUIState]
  );

  const handleSingleTap = useCallback<HammerListener>(
    (e) => handleSingleTapHelper(galaxy, mapUIState, setCurrentView, e),
    [mapUIState]
  );

  const resize = () => {
    const canvas = getMapCanvas();
    const width = document.body.clientWidth;
    const height = document.body.clientHeight;
    canvas.width = width;
    canvas.height = height;
    const cachedGrid = cachedGridRef.current;
    cachedGrid.width = width;
    cachedGrid.height = height;
    drawGrid(cachedGrid, galaxy, mapUIState);
  };

  // always reset onresize event
  window.onresize = resize;

  // isNewAnimationFrame indicates the canvas should be redrawn after requestAnimationFrame()
  const [isNewAnimationFrame, triggerNewAnimationFrame] = useState({});

  // set up events (overwriting them every new render)
  useEffect(() => {
    const canvas = getMapCanvas();

    if (!hammer.current.manager) {
      const manager = new Hammer.Manager(canvas);
      const double = new Hammer.Tap({ event: "doubletap", taps: 2 });
      const single = new Hammer.Tap({ event: "singletap" });
      const panRecognizer = new Hammer.Pan().set({
        direction: Hammer.DIRECTION_ALL,
      });
      manager.add([new Hammer.Pinch(), double, single, panRecognizer]);
      double.recognizeWith(single);
      single.requireFailure(double);
      hammer.current.manager = manager;
    }

    const { manager } = hammer.current;

    manager.off("singletap");
    manager.on("singletap", handleSingleTap);

    manager.off("pan");
    manager.on("pan", handlePan);

    manager.off("doubletap");
    manager.on("doubletap", handleDoubleTap);

    manager.off("pinch");
    manager.on("pinch", handleWheel);

    // mouse wheel event handled separately
    canvas.onwheel = handleWheel;
  });

  // setup event handlers and the infinite event loop
  useEffect(() => {
    resize();

    function repeat() {
      triggerNewAnimationFrame({});
      requestAnimationFrame(repeat);
    }
    repeat();
  }, []);

  // update cached grid whenver game is mutated
  useEffect(() => {
    drawGrid(cachedGridRef.current, galaxy, mapUIState);
  }, [gameUpdateFlag, mapUIState]);

  // event loop
  useEffect(() => {
    if (mapUIState.animationAction) {
      dispatch(mapUIState.animationAction);
    }
    draw(galaxy, mapUIState, cachedGridRef.current);
  }, [isNewAnimationFrame]);

  return <Canvas id={MAP_CANVAS_ID} />;
};

const Canvas = styled.canvas`
  grid-column: 1;
  grid-row: 2;
  width: 100%;
  height: 100%;
`;

export default Map;
