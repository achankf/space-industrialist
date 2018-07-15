import * as Hammer from "hammerjs";
import * as Immutable from "immutable";
import { add, norm, project, SortedTrie, subtract } from "myalgo-ts";
import * as React from "react";
import { connect } from "react-redux";
import { Dispatch } from "redux";
import { Game } from "../game";
import { CoorT, IMapData, IRouteSegment, MapDataKind } from "../model";
import { Colony } from "../model/colony";
import { Fleet as FleetModel } from "../model/fleet";
import { colonyCmp } from "../model/galaxy";
import { Planet as PlanetModel } from "../model/planet";
import { Product, RawMaterial } from "../model/product";
import { addClosable, ClosableAction, ClosablePanelType } from "./action/closable_action";

const MIN_GRID_SIZE = 50;
const MAX_GRID_SIZE = 300;
const RADIUS = 3 / 10;

interface IMapViewSaveData {
    topLeft: [number, number];
    gridSize: number;
}

interface IMapDispatchProps {
    addFleetPanel: (fleet: FleetModel) => void;
    addPlanetPanel: (planet: PlanetModel) => void;
    addRoutePanel: (route: IRouteSegment) => void;
    addSelector: (objs: IMapData[]) => void;
}

interface IMapOwnProps {
    gameWrapper: { game: Game };
}

type MapProps = IMapOwnProps & IMapDispatchProps;

class Map extends React.PureComponent<MapProps> {

    private canvas!: HTMLCanvasElement;

    // UI data
    private topLeft: [number, number];
    private gridSize = MIN_GRID_SIZE;
    private cachedGrid: HTMLCanvasElement;
    private updateAnimation?: () => void;

    constructor(props: MapProps) {
        super(props);
        this.cachedGrid = document.createElement("canvas");

        const game = this.props.gameWrapper.game;
        this.topLeft = game.getReader().calCenter();
    }

    public serialize(): IMapViewSaveData {
        return {
            gridSize: this.gridSize,
            topLeft: this.topLeft,
        };
    }

    public componentDidMount() {

        const game = this.props.gameWrapper.game;

        const gesture = new Hammer.Manager(this.canvas);
        const double = new Hammer.Tap({ event: "doubletap", taps: 2 });
        const single = new Hammer.Tap({ event: "singletap" });
        const pan = new Hammer.Pan()
            .set({ direction: Hammer.DIRECTION_ALL });
        gesture.add([
            new Hammer.Pinch(),
            double,
            single,
            pan,
        ]);
        double.recognizeWith(single);
        single.requireFailure(double);

        // setup events
        gesture.on("singletap", (e) => this.click(game, e));
        gesture.on("doubletap", (e) => this.dblclick(game, e));
        gesture.on("pinch", (e) => this.wheel(game, e));
        gesture.on("pan", (e) => this.pan(game, e));

        // mouse wheel event handled separately
        this.canvas.addEventListener("wheel", (e) => this.wheel(game, e));

        const resize = () => {
            const width = document.body.clientWidth;
            const height = document.body.clientHeight;
            this.canvas.width = width;
            this.canvas.height = height;
            this.cachedGrid.width = width;
            this.cachedGrid.height = height;
            this.cachedGrid = this.drawGrid(game);
        };

        window.addEventListener("resize", resize);

        resize();
        this.draw();
    }

    public render() {
        return <canvas id="map" ref={(canvas) => this.canvas = canvas!} />;
    }

    private draw = () => {

        const game = this.props.gameWrapper.game;

        if (this.updateAnimation !== undefined) {
            this.updateAnimation();
            this.cachedGrid = this.drawGrid(game);
        }

        // draw the map
        const width = document.body.clientWidth;
        const height = document.body.clientHeight;
        const ctx = this.canvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.drawGrid(game), 0, 0);
        ctx.drawImage(this.drawObjects(game), 0, 0);

        requestAnimationFrame(this.draw);
    }

    private getCanvasContext(canvas?: HTMLCanvasElement): [HTMLCanvasElement, CanvasRenderingContext2D] {
        if (!canvas) {
            canvas = document.createElement("canvas");
        }
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("cannot create context");
        }
        return [canvas, context];
    }

    private drawObjects(game: Game) {
        const galaxy = game.getReader();
        const [canvas, ctx] = this.getCanvasContext();
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;

        const groups = Immutable
            .Seq(galaxy.getObjs())
            .groupBy(([x]) => x.kind);

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
                const [vpX, vpY] = this.toVpCoor(coor);

                const fleet = obj as FleetModel;
                const angle = galaxy.getAngle(fleet);
                ctx.save();
                ctx.beginPath();
                ctx.translate(vpX, vpY);
                ctx.rotate(angle);
                ctx.scale(0.5, 0.5);
                this.drawTriangle(ctx);
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
            const planetArray = Array.from(planetGroup.values()) as Array<[PlanetModel, CoorT]>;
            const allPlanets = Immutable
                .Seq(planetArray)
                .groupBy(([x]) => (x as PlanetModel).resource);

            ctx.save();

            // draw planet symbols (colored circles)
            ctx.fillStyle = "yellow";
            ctx.strokeStyle = "yellow";
            const radius = RADIUS * this.gridSize;

            const drawPlanetCircle = (color: string, resource: RawMaterial) => {
                const planetByResource = allPlanets.get(resource);
                if (!planetByResource) {
                    console.assert(false, "all planets should be distributed about evenly in terms of raw material types"); // TODO validate this
                    return;
                }
                const planets = planetByResource.values();
                ctx.fillStyle = color;
                for (const [, coor] of planets) {
                    const [vpX, vpY] = this.toVpCoor(coor);
                    ctx.beginPath();
                    this.drawCircle(ctx, vpX, vpY, radius);
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
            const fontSize = Math.ceil(RADIUS * this.gridSize);
            ctx.font = `${fontSize}px sans-serif`;
            for (const [planet, coor] of planetArray) {
                const [vpX, vpY] = this.toVpCoor(coor);
                ctx.beginPath();
                ctx.fillText(`${planet.id}`, vpX, vpY);
            }
            ctx.restore();

            // draw colony indicators
            ctx.strokeStyle = "purple";
            ctx.lineWidth = 2;
            for (const [planet, coor] of planetArray) {
                if (planet.getColony() !== undefined) {
                    ctx.beginPath();
                    const [vpX, vpY] = this.toVpCoor(coor);
                    this.drawCircle(ctx, vpX, vpY, radius);
                    ctx.stroke();
                }
            }
            ctx.restore();
        };

        drawPlanets();
        drawFleets();

        return canvas;
    }

    private drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        ctx.arc(x, y, r, 0, 2 * Math.PI);
    }

    private drawTradeRoutes(game: Game, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {

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

                const [ux, uy] = this.toVpCoor(galaxy.getCoor(u));
                const [vx, vy] = this.toVpCoor(galaxy.getCoor(v));
                ctx.beginPath();
                ctx.moveTo(ux, uy);
                ctx.lineTo(vx, vy);
                ctx.stroke();
            }
        }
        ctx.restore();

        return canvas;
    }

    private drawGrid(game: Game) {

        const canvas = this.cachedGrid;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            throw new Error("cannot create context");
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#494949";

        const gridSize = this.gridSize;

        // draw all horizontal lines
        const startX = ((this.topLeft[0] * gridSize) % gridSize + gridSize) % gridSize;
        for (let curX = 0; curX <= canvas.width; curX += gridSize) {
            const curX2 = Math.ceil(curX + startX);
            ctx.beginPath();
            ctx.moveTo(curX2 + 0.5, 0.5);
            ctx.lineTo(curX2 + 0.5, canvas.height + 0.5);
            ctx.stroke();
        }

        // draw all vertical lines
        const startY = ((this.topLeft[1] * gridSize) % gridSize + gridSize) % gridSize;
        for (let curY = 0; curY <= canvas.height; curY += gridSize) {
            const curY2 = Math.ceil(curY + startY);
            ctx.beginPath();
            ctx.moveTo(0.5, curY2 + 0.5);
            ctx.lineTo(canvas.width + 0.5, curY2 + 0.5);
            ctx.stroke();
        }

        ctx.restore();

        this.drawTradeRoutes(game, canvas, ctx);
        return canvas;
    }

    // helper function behind the event handlers
    private panTo(game: Game, vpFrom: [number, number], vpTo: [number, number]) {

        this.updateAnimation = undefined;

        const from = this.toGameCoor(vpFrom);
        const to = this.toGameCoor(vpTo);
        const offset = subtract(from, to);
        let distance = norm(offset);

        this.updateAnimation = () => {
            const speed = distance * 0.02;
            let final;
            if (speed === 0) {
                return; // no change
            }

            if (speed < 0.01 / this.gridSize) {
                this.updateAnimation = undefined;
                final = distance;
            } else {
                final = speed;
                distance -= speed;
            }
            const proj = project(offset, final);
            this.topLeft = add(this.topLeft, proj);
        };
    }

    private drawTriangle(ctx: CanvasRenderingContext2D) {
        ctx.moveTo(0, 0);
        ctx.lineTo(5, 20);
        ctx.lineTo(-5, 20);
        ctx.closePath();
    }

    private pan(game: Game, e: HammerInput) {
        this.panTo(game, this.getVpCenter(), add(this.getVpCenter(), [e.deltaX, e.deltaY]));
    }

    private click(game: Game, e: HammerInput) {
        const galaxy = game.getReader();
        const bb = e.target.getBoundingClientRect();
        const coor = [
            e.center.x - bb.left,
            e.center.y - bb.top,
        ] as [number, number];
        const gameCoor = this.toGameCoor(coor);

        const nearbyObjs = galaxy
            .searchNearbyObjs(gameCoor, RADIUS)
            .toArray();
        switch (nearbyObjs.length) {
            case 0: break;
            case 1: {
                const obj = nearbyObjs[0];
                switch (obj.kind) {
                    case MapDataKind.Fleet:
                        this.props.addFleetPanel(obj as FleetModel);
                        break;
                    case MapDataKind.Planet:
                        this.props.addPlanetPanel(obj as PlanetModel);
                        break;
                    case MapDataKind.RouteSegment:
                        this.props.addRoutePanel(obj as IRouteSegment);
                        break;
                }
                break;
            }
            default: {
                this.props.addSelector(nearbyObjs);
                break;
            }
        }
    }

    private dblclick(game: Game, e: HammerInput) {
        const bb = e.target.getBoundingClientRect();
        const coor = [
            e.center.x - bb.left,
            e.center.y - bb.top,
        ] as [number, number];
        this.panTo(game, this.getVpCenter(), coor);
    }

    private wheel(game: Game, e: WheelEvent | HammerInput) {

        this.updateAnimation = undefined;

        const isZoomingIn = e.deltaY < 0;
        const centerCoor = this.getCenter();
        let zoomSpeed = 10;
        this.updateAnimation = () => {
            if (isZoomingIn) {
                this.gridSize = Math.min(MAX_GRID_SIZE, this.gridSize + zoomSpeed);
            } else {
                this.gridSize = Math.max(MIN_GRID_SIZE, this.gridSize - zoomSpeed);
            }
            this.topLeft = this.centerVp(this.toVpCoor(centerCoor));

            if (this.updateAnimation !== undefined) {
                zoomSpeed /= 1.1;
                if (zoomSpeed < 1) {
                    this.updateAnimation = undefined;
                }
            }
        };
    }

    private centerVp(vpAt: [number, number]) {
        const at = this.toGameCoor(vpAt);
        const offset = subtract(this.getCenter(), at);
        return add(this.topLeft, offset);
    }

    private toVpCoor([x, y]: [number, number]): [number, number] {
        const [tlX, tlY] = this.topLeft;
        return [(x + tlX) * this.gridSize, (y + tlY) * this.gridSize];
    }

    private toGameCoor([x, y]: [number, number]): [number, number] {
        const [tlX, tlY] = this.topLeft;
        return [x / this.gridSize - tlX, y / this.gridSize - tlY];
    }

    private getVpCenter(): [number, number] {
        const canvas = this.canvas;
        return [canvas.width / 2, canvas.height / 2];
    }

    private getCenter(): [number, number] {
        return this.toGameCoor(this.getVpCenter());
    }
}

const dispatchers = (dispatch: Dispatch<ClosableAction>): IMapDispatchProps => ({
    addFleetPanel: (fleet: FleetModel) => dispatch(addClosable(ClosablePanelType.Fleet, fleet)),
    addPlanetPanel: (planet: PlanetModel) => dispatch(addClosable(ClosablePanelType.Planet, planet)),
    addRoutePanel: (route: IRouteSegment) => dispatch(addClosable(ClosablePanelType.Route, route)),
    addSelector: (objs: IMapData[]) => dispatch(addClosable(ClosablePanelType.Selector, objs)),
});

export default connect(undefined, dispatchers)(Map);
