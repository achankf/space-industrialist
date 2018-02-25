import * as Immutable from "immutable";
import * as Algo from "../algorithm/algorithm";
import { Game, ISaveData, UpdateChannel } from "../game";
import * as Model from "../model/model";
import * as View from "../view/view";

const GRID_SIZE = 300;
const UI_INTERVAL = 17;
const MIN_DRAG_DISTANCE = 100;

type Event = JQuery.Event<HTMLCanvasElement, null>;

export interface IMapViewAction {
    handleSelected(view: MapView, game: Game, coor: Model.CoorT): boolean;
    handleZoom(view: MapView, game: Game): boolean;
    getTexts(view: MapView, game: Game): string[];
}

const setup: IMapViewAction = {
    handleSelected: (view: MapView, game: Game, coor: Model.CoorT) => {
        const galaxy = game.galaxy;
        const objs = galaxy.searchNearbyObjs(coor, 0.1).toArray();
        if (objs.length === 1) {
            const planet = objs[0] as Model.Planet;
            if (planet.kind === Model.MapDataKind.Planet &&
                planet.resource === Model.Product.Crop) {
                const colony = galaxy.colonizePlanet(planet, 10);
                colony.expandPowerPlanet(galaxy);
                view.setAction();
                game.queueUpdate(UpdateChannel.MapChange);
            }
        }
        return false;
    },
    handleZoom: () => false,
    getTexts: () => [
        "Hello. Select a food-producing (green) planet to be your", "starting planet, then unpause the game (button in top-right corner).",
        "After you're done, mouse over the user interface, like labels,", "buttons, tables, to see the tooltips about game concepts, especially",
        "the market panel on colonized planets, which explains the game economics.",
        "Feel free to click on any colored items on the map, as they are interactive."],
};

export interface IMapViewSaveData {
    topLeft: [number, number];
    gridSize: number;
    hasSetup: boolean;
}

export class MapView implements View.Observer {

    public readonly view = document.createElement("canvas") as HTMLCanvasElement;
    private readonly context: CanvasRenderingContext2D;

    // UI data
    private topLeft: [number, number] = [0, 0];
    private gridSize = GRID_SIZE;

    private dragPos?: [number, number];
    private currentAction?: IMapViewAction;
    private cachedGrid: HTMLCanvasElement;
    private isDragging = false;
    private pid?: number;

    constructor(game: Game, saveData?: ISaveData) {
        [, this.context] = this.getCanvasContext(this.view);
        this.cachedGrid = document.createElement("canvas");

        $("#mapContainer")
            .empty()
            .append(this.view);

        ($(this.view) as JQuery<HTMLCanvasElement>)
            .attr("id", "map")
            .mousedown(() => this.mousedown(game))
            .contextmenu((e) => this.rclick(game, e))
            .click((e) => this.click(game, e))
            .dblclick((e) => this.dblclick(game, e))
            .on("wheel", (e) => this.onwheel(game, e.originalEvent as WheelEvent));

        if (saveData) {
            const mapViewSave = saveData.mapViewSave;
            if (!mapViewSave || !mapViewSave.hasSetup) {
                // first-time setup bonus
                this.currentAction = setup;
            } else {
                this.gridSize = mapViewSave.gridSize;
                this.topLeft = mapViewSave.topLeft;
            }
        } else {
            // first-time setup bonus
            this.currentAction = setup;
        }

        return this;
    }

    public serialize(): IMapViewSaveData {
        return {
            topLeft: this.topLeft,
            gridSize: this.gridSize,
            hasSetup: this.currentAction === undefined,
        };
    }

    public loadSave(game: Game, saveData: IMapViewSaveData) {
        this.topLeft = saveData.topLeft;
        this.gridSize = saveData.gridSize;
        game.queueUpdate(UpdateChannel.MapChange);
    }

    public setAction(action?: IMapViewAction) {
        this.currentAction = action;
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

            this.cachedGrid.width = document.body.clientWidth;
            this.cachedGrid.height = document.body.clientHeight;

            this.cachedGrid = this.drawGrid(game);
        } else if (channels.has(UpdateChannel.MapChange)) {
            // usually this happens whenever the user manipulates the UI
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
        const texts = this.currentAction.getTexts(this, game);
        if (texts.length === 0) {
            return;
        }
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = "gray";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = "12px Arial";
        let offset = 0;
        for (const text of this.currentAction.getTexts(this, game)) {
            ctx.strokeText(text, Math.ceil(this.view.width / 2), Math.ceil(this.view.height / 2) + offset);
            ctx.fill();
            offset += 17;
        }
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

        const groups = Immutable
            .Seq(galaxy.getObjs())
            .groupBy(([x]) => x.kind);

        const drawFleets = () => {
            const fleetGroup = groups.get(Model.MapDataKind.Fleet);
            if (!fleetGroup) {
                return;
            }
            const fleets = fleetGroup.values();

            ctx.save();
            ctx.fillStyle = "yellow";
            ctx.strokeStyle = "yellow";
            for (const [obj, coor] of fleets) {
                const [vpX, vpY] = this.toVpCoor(coor);

                const fleet = obj as Model.Fleet;
                const angle = fleet.getAngle(galaxy);
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
            const planetGroup = groups.get(Model.MapDataKind.Planet);
            if (!planetGroup) {
                throw new Error("game generation should generate at least 1 planet");
            }
            const planetArray = Array.from(planetGroup.values()) as Array<[Model.Planet, Model.CoorT]>;
            const allPlanets = Immutable
                .Seq(planetArray)
                .groupBy(([x]) => (x as Model.Planet).resource);

            ctx.save();

            // draw planet symbols (colored circles)
            ctx.fillStyle = "yellow";
            ctx.strokeStyle = "yellow";
            const radius = 10;

            const drawPlanetCircle = (color: string, resource: Model.RawMaterial) => {
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

            drawPlanetCircle("green", Model.Product.Crop);
            drawPlanetCircle("brown", Model.Product.Metal);
            drawPlanetCircle("darkcyan", Model.Product.Gem);
            drawPlanetCircle("orange", Model.Product.Fuel);
            ctx.restore();

            // draw ids
            ctx.strokeStyle = "yellow";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            for (const [planet, coor] of planetArray) {
                const [vpX, vpY] = this.toVpCoor(coor);
                ctx.beginPath();
                ctx.strokeText(`${planet.id}`, vpX, vpY);
                ctx.stroke();
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

        const galaxy = game.galaxy;
        const tradeRoutes = galaxy.getTradeRoutes();

        ctx.save();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "cyan";

        const drawn = new Algo.OrderListSet<Model.Colony>((a, b) => a.id - b.id);

        for (const [u, vs] of tradeRoutes) {
            for (const v of vs) {

                const edge = [u, v];
                if (drawn.has(...edge)) {
                    continue;
                }
                drawn.add(...edge);

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

    private mousedown(game: Game) {
        this.stopAction();

        const downPos = this.getVpCenter(); // [e.clientX!, e.clientY!] as [number, number];

        let speed = 1;
        let isMouseup = false;

        this.stopAction();

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
            this.isDragging = false;
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
        const radius = 10 / this.gridSize;
        return galaxy.searchNearbyObjs(gameCoor, radius);
    }

    private rclick(game: Game, e: Event) {
        const nearbyObjs = this
            .getClickedObjects(game, e)
            .toArray();
        if (nearbyObjs.length === 1) {
            const obj = nearbyObjs[0] as Model.ILocatable;
            switch (obj.kind) {
                case Model.MapDataKind.Planet:
                case Model.MapDataKind.Fleet:
                    console.log(obj.id);
            }
        }
    }

    private click(game: Game, e: Event) {
        if (!this.isDragging) {

            const coor = [e.clientX, e.clientY] as [number, number];
            const gameCoor = this.toGameCoor(coor);

            if (this.currentAction) {
                this.currentAction.handleSelected(this, game, gameCoor);
            } else {
                const nearbyObjs = this.getClickedObjects(game, e).toArray();
                switch (nearbyObjs.length) {
                    case 0: break;
                    case 1: {
                        const obj = nearbyObjs[0];
                        View.SelectView.createSingle(game, obj);
                        break;
                    }
                    default: {
                        game.addClosable(new View.SelectView(game, nearbyObjs));
                        break;
                    }
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
        const isZoomingIn = e.deltaY < 0;
        const centerCoor = this.getCenter();
        let zoomSpeed = 10;
        this.pid = setInterval(() => {
            if (isZoomingIn) {
                this.gridSize = Math.min(GRID_SIZE * 5, this.gridSize + zoomSpeed);
            } else {
                this.gridSize = Math.max(50, this.gridSize - zoomSpeed);
            }
            this.topLeft = this.centerVp(this.toVpCoor(centerCoor));

            if (this.pid !== undefined) {
                zoomSpeed /= 1.1;
                if (zoomSpeed < 1) {
                    clearInterval(this.pid);
                }
            }
            game.queueUpdate(UpdateChannel.MapChange);
        }, UI_INTERVAL);
    }

    private centerVp(vpAt: [number, number]) {
        const at = this.toGameCoor(vpAt);
        const offset = Algo.subtract2D(this.getCenter(), at);
        return Algo.sum2D(this.topLeft, offset);
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
        const $view = $(this.view);
        return [$view.width()! / 2, $view.height()! / 2];
    }

    private getCenter(): [number, number] {
        return this.toGameCoor(this.getVpCenter());
    }
}
