import * as Algo from "../algorithm/algorithm.js";
import { Game, UpdateChannel } from "../game.js";
import * as Model from "../model/model.js";
import * as View from "../view/view.js";

const GRID_SIZE = 300;
const UI_INTERVAL = 17;
const MIN_DRAG_DISTANCE = 100;

type Event = JQuery.Event<HTMLCanvasElement, null>;

export interface IMapViewAction {
    handleSelected(view: MapView, game: Game, coor: Model.CoorT): boolean;
    handleZoom(view: MapView, game: Game): boolean;
    getText(view: MapView, game: Game): string;
}

const setup = {
    handleSelected: (view: MapView, game: Game, coor: Model.CoorT) => {
        const galaxy = game.galaxy;
        const objs = galaxy.getNearbyObjs(coor, 0.1);
        if (objs.size === 1) {
            const obj = objs.values().next().value as Model.Planet;
            if (obj.kind === Model.MapDataKind.Planet &&
                obj.resource === Model.Product.Crop) {
                galaxy.colonizePlanet(obj, 1);
                view.setAction(setup2);
                game.queueUpdate(UpdateChannel.MapChange);
            }
        }
        return false;
    },
    handleZoom: () => false,
    getText: () => "Hello. Select a food-producing (green) planet to be your starting planet.",
};

const setup2 = {
    handleSelected: (view: MapView, game: Game, coor: Model.CoorT) => {
        const galaxy = game.galaxy;
        const objs = galaxy.getNearbyObjs(coor, 0.1, 0.08) as Set<Model.Planet>;
        console.log(`>${coor[0]} ${coor[1]}`);
        for (const obj of objs) {
            const c = galaxy.getCoor(obj);
            console.log(`${c[0]} ${c[1]}`);
            if (obj.kind === Model.MapDataKind.Planet &&
                obj.getColony() !== undefined // it's the starting planet
            ) {
                galaxy.addShipyard(coor, obj);
                view.setAction();
                game.queueUpdate(UpdateChannel.MapChange);
                break;
            }
        }
        return false;
    },
    handleZoom: () => false,
    getText: () => "Click near your starting planet to create your first shipyard.",
};

export class MapView {

    public readonly view = document.getElementById("map") as HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    // UI data
    private topLeft: [number, number] = [0, 0];
    private cachedGrid: HTMLCanvasElement;
    private gridSize = GRID_SIZE;
    private dragPos: [number, number] | undefined;
    private isDragging = false;
    private currentAction: IMapViewAction | undefined = setup;

    private pid: number | undefined;

    constructor(
        game: Game,
    ) {
        [, this.context] = this.getCanvasContext(this.view);

        ($(this.view) as JQuery<HTMLCanvasElement>)
            .mousedown((e) => this.mousedown(game, e))
            .contextmenu((e) => this.rclick(game, e))
            .click((e) => this.click(game, e))
            .dblclick((e) => this.dblclick(game, e));

        this.view.onwheel = (e) => this.onwheel(game, e);
    }

    public setAction(action?: IMapViewAction) {
        this.currentAction = action;
    }

    public center(vpAt: [number, number]) {
        const at = this.toGameCoor(vpAt);
        const offset = Algo.subtract2D(this.getCenter(), at);
        return Algo.sum2D(this.topLeft, offset);
    }

    public toVpCoor([x, y]: [number, number]): [number, number] {
        const [tlX, tlY] = this.topLeft;
        return [(x + tlX) * this.gridSize, (y + tlY) * this.gridSize];
    }

    public toGameCoor([x, y]: [number, number]): [number, number] {
        const [tlX, tlY] = this.topLeft;
        return [x / this.gridSize - tlX, y / this.gridSize - tlY];
    }

    public getVpCenter(): [number, number] {
        const $view = $(this.view);
        return [$view.width()! / 2, $view.height()! / 2];
    }

    public getCenter(): [number, number] {
        const [x, y] = this.topLeft;
        return this.toGameCoor(this.getVpCenter());
    }

    public update(game: Game, channels: Set<UpdateChannel>) {
        const $view = $(this.view) as JQuery<HTMLCanvasElement>;

        // set up the size of the canvas
        const width = document.body.clientWidth;
        const height = document.body.clientHeight;
        const attrWidth = Number($view.attr("width"));
        const attrHeight = Number($view.attr("height"));
        if (attrWidth !== width || height !== attrHeight) {
            $view
                .attr("width", width)
                .attr("height", height)
                .width(width)
                .height(height);
            this.cachedGrid = this.drawGrid(game);
        } else if (channels.has(UpdateChannel.MapChange)) {
            this.cachedGrid = this.drawGrid(game);
        }

        // draw the map
        const ctx = this.context;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(this.cachedGrid, 0, 0);
        ctx.drawImage(this.drawObjects(game), 0, 0);
        this.drawActionText(game);

        if (this.dragPos) {
            this.drawArrow(ctx, this.getVpCenter(), this.dragPos, "yellow");
        }

    }

    private drawActionText(game: Game) {
        const ctx = this.context;
        if (!this.currentAction) {
            return;
        }
        const text = this.currentAction.getText(this, game);
        if (text.length === 0) {
            return;
        }
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "gray";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeText(text, Math.ceil(this.view.width / 2), Math.ceil(this.view.height / 2));
        ctx.stroke();
        ctx.restore();
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
        const galaxy = game.galaxy;
        const [canvas, ctx] = this.getCanvasContext();
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;

        ctx.save();
        ctx.fillStyle = "white";

        const groups: Array<Array<[Model.IMapData, Model.CoorT]>> = [];
        for (const kind of Model.allMapDataKind()) {
            groups[kind] = [];
        }
        for (const obj of galaxy.getObjs()) {
            const kind = obj[0].kind;
            groups[kind].push(obj);
        }

        const drawOrder = [
            Model.MapDataKind.Planet,
            Model.MapDataKind.Shipyard,
            Model.MapDataKind.Fleet,
        ];

        for (const kind of drawOrder) {
            for (const [obj, coor] of groups[kind]) {
                const [vpX, vpY] = this.toVpCoor(coor);

                ctx.save();
                switch (kind) {
                    case Model.MapDataKind.Fleet:
                        {
                            const fleet = obj as Model.Fleet;
                            const angle = fleet.getAngle(galaxy);
                            ctx.fillStyle = "yellow";
                            ctx.strokeStyle = "yellow";
                            ctx.beginPath();
                            ctx.translate(vpX, vpY);
                            ctx.rotate(angle);
                            ctx.scale(0.5, 0.5);
                            this.drawTriangle(ctx);
                            ctx.fill();
                        }
                        break;
                    case Model.MapDataKind.Shipyard:
                        {
                            ctx.beginPath();
                            ctx.strokeStyle = "brown";
                            ctx.fillStyle = "brown";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.font = "25px serif";
                            ctx.strokeText("🛰", vpX, vpY);
                            ctx.stroke();
                        }
                        break;
                    case Model.MapDataKind.Planet:
                        {
                            const radius = 10;
                            const planet = obj as Model.Planet;
                            switch (planet.resource) {
                                case Model.Product.Crop:
                                    ctx.fillStyle = "green";
                                    break;
                                case Model.Product.Metal:
                                    ctx.fillStyle = "brown";
                                    break;
                                case Model.Product.Gem:
                                    ctx.fillStyle = "darkcyan";
                                    break;
                                case Model.Product.Fuel:
                                    ctx.fillStyle = "orange";
                                    break;
                                default:
                                    throw new Error("not handled");
                            }
                            ctx.beginPath();
                            this.drawCircle(ctx, vpX, vpY, radius);
                            ctx.fill();

                            const buildRadiusMax = 0.1 * this.gridSize;
                            const buildRadiusMin = 0.08 * this.gridSize;
                            const buildRadius = 0.09 * this.gridSize;
                            const buildWidth = 0.02 * this.gridSize;
                            if (buildRadiusMax > radius) {
                                ctx.save();
                                ctx.strokeStyle = "white";
                                ctx.lineWidth = buildWidth;
                                ctx.beginPath();
                                this.drawCircle(ctx, vpX, vpY, buildRadius);
                                ctx.stroke();
                                ctx.restore();
                            }

                            ctx.strokeStyle = "yellow";
                            ctx.beginPath();
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.strokeText(`${obj.id}`, vpX, vpY);
                            ctx.stroke();

                            if (planet.getColony() !== undefined) {
                                ctx.beginPath();
                                ctx.strokeStyle = "purple";
                                ctx.lineWidth = 2;
                                this.drawCircle(ctx, vpX, vpY, radius);
                                ctx.stroke();
                            }
                        }
                        break;
                }
                ctx.restore();
            }
        }

        return canvas;
    }

    private drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
        ctx.arc(x, y, r, 0, 2 * Math.PI);
    }

    private drawTradeRoutes(game: Game, canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {

        const galaxy = game.galaxy;
        const tradeRoutes = galaxy.getTradeRoutes();

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "cyan";

        const drawn = new Algo.OrderListSet<Model.Market>((a, b) => a.id - b.id);

        for (const [u, vs] of tradeRoutes) {
            for (const v of vs) {

                const edge = [u, v];
                if (drawn.has(...edge)) {
                    continue;
                }
                drawn.add(...edge);

                const [ux, uy] = this.toVpCoor(galaxy.getMarketCoor(u));
                const [vx, vy] = this.toVpCoor(galaxy.getMarketCoor(v));
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

        const [canvas, ctx] = this.getCanvasContext();
        canvas.width = document.body.clientWidth;
        canvas.height = document.body.clientHeight;

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "#111111";

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

    private zoom(game: Game, centerCoor: [number, number], isZoomingIn: boolean) {
        let zoomSpeed = 10;
        const pid = setInterval(() => {
            if (isZoomingIn) {
                this.gridSize = Math.min(GRID_SIZE * 5, this.gridSize + zoomSpeed);
            } else {
                this.gridSize = Math.max(50, this.gridSize - zoomSpeed);
            }
            this.topLeft = this.center(this.toVpCoor(centerCoor));

            if (pid !== undefined) {
                zoomSpeed /= 1.1;
                if (zoomSpeed < 1) {
                    clearInterval(pid);
                }
            }
            game.queueUpdate(UpdateChannel.MapChange);
        }, UI_INTERVAL);
        return pid;
    }

    private panTo(game: Game, vpFrom: [number, number], vpTo: [number, number]) {
        const from = this.toGameCoor(vpFrom);
        const to = this.toGameCoor(vpTo);
        const offset = Algo.subtract2D(from, to);
        let distance = Algo.norm2D(offset);
        const pid = setInterval(() => {
            const speed = distance * 0.01;
            if (speed < 0.01 / this.gridSize) {
                clearInterval(pid);
                const proj = Algo.project2D(offset, distance);
                this.topLeft = Algo.sum2D(this.topLeft, proj);
            } else {
                const proj = Algo.project2D(offset, speed);
                this.topLeft = Algo.sum2D(this.topLeft, proj);
                distance -= speed;
            }
            game.queueUpdate(UpdateChannel.MapChange);
        });
        return pid;
    }

    // https://stackoverflow.com/a/16027466
    private drawArrow(ctx: CanvasRenderingContext2D, from: [number, number], to: [number, number], color: string) {
        const [x, y] = Algo.subtract2D(to, from);
        let angle = Math.atan(y / x);
        angle += ((from[0] >= to[0]) ? -90 : 90) * Math.PI / 180;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(from[0], from[1]);
        ctx.lineTo(to[0], to[1]);
        ctx.stroke();

        // arrowhead
        ctx.translate(to[0], to[1]);
        ctx.rotate(angle);
        this.drawTriangle(ctx);
        ctx.fill();
        ctx.restore();
    }

    private drawTriangle(ctx: CanvasRenderingContext2D) {
        ctx.moveTo(0, 0);
        ctx.lineTo(5, 20);
        ctx.lineTo(-5, 20);
        ctx.closePath();
    }

    private stopAction() {
        if (this.pid !== undefined) {
            clearInterval(this.pid);
            this.pid = undefined;
        }
    }

    private mousedown(game: Game, e: Event) {
        this.stopAction();

        const downPos = this.getVpCenter(); // [e.clientX!, e.clientY!] as [number, number];

        let speed = 1;
        let isMouseup = false;

        // keep panning the map until mouseup
        this.pid = setInterval(() => {
            if (this.dragPos) {
                const offset = Algo.subtract2D(downPos, this.dragPos);
                const vpDistance = Algo.norm2D(offset);
                if (vpDistance > MIN_DRAG_DISTANCE) {
                    const gameDistance = vpDistance / this.gridSize;
                    // translate by 2% of game distance of the drag path, times speed
                    const proj = Algo.project2D(offset, gameDistance * 0.02 * speed);
                    this.topLeft = Algo.sum2D(this.topLeft, proj);
                }
            }

            // slowly & smoothly slow down to a halt
            if (this.pid !== undefined && isMouseup) {
                speed /= 1.1;
                if (speed < 0.1) {
                    clearInterval(this.pid);
                    this.pid = undefined;
                }
            }

            game.queueUpdate(UpdateChannel.MapChange);

        }, UI_INTERVAL);
        $(document).mouseup(() => {
            isMouseup = true;
            this.dragPos = undefined;
            $(document)
                .off("mouseup")
                .off("mousemove");
        }).mousemove((eInner) => {
            this.isDragging = true;
            this.dragPos = [eInner.clientX, eInner.clientY] as [number, number];
        });
    }

    private getClickedObjects(game: Game, e: Event) {
        const galaxy = game.galaxy;
        const coor = [e.clientX, e.clientY] as [number, number];
        const gameCoor = this.toGameCoor(coor);
        return galaxy.getNearbyObjs(gameCoor, 0.1);
    }

    private rclick(game: Game, e: Event) {
        const nearbyObjs = this.getClickedObjects(game, e);
        if (nearbyObjs.size === 1) {
            const obj = nearbyObjs.values().next().value;
            console.log(obj.id);
        }
    }

    private click(game: Game, e: Event) {
        const galaxy = game.galaxy;
        if (!this.isDragging) {
            if (this.currentAction) {
                const coor = [e.clientX, e.clientY] as [number, number];
                const gameCoor = this.toGameCoor(coor);
                this.currentAction.handleSelected(this, game, gameCoor);
            } else {
                const nearbyObjs = this.getClickedObjects(game, e);
                switch (nearbyObjs.size) {
                    case 0: break;
                    case 1: {
                        const obj = nearbyObjs.values().next().value;
                        View.SelectView.createSingle(game, obj);
                        break;
                    }
                    default:
                        game.addClosable(new View.SelectView(game, nearbyObjs));
                        break;
                }
            }
        }
        this.isDragging = false;
    }

    private dblclick(game: Game, e: Event) {
        this.stopAction();
        const coor = [e.clientX, e.clientY] as [number, number];
        this.pid = this.panTo(game, this.getVpCenter(), coor);
    }

    private onwheel(game: Game, e: WheelEvent) {
        this.stopAction();
        const isZoomingIn = e.wheelDelta > 0;
        const centerCoor = this.getCenter();
        this.pid = this.zoom(game, centerCoor, isZoomingIn);
    }
}
