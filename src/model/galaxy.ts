import * as Algo from "../algorithm/algorithm.js";
import * as Model from "./model.js";

const BIG_TURN = 50;
export type CoorT = [number, number];
export type ColonizableT = Model.Planet;
export type SatelliteT = Model.Shipyard;

export class Galaxy {

    // map objects & their coordinates
    private readonly objects = new Map<IMapData, CoorT>();
    // arranged into a tile grid, where object coordinates are ceiled
    private readonly coorIndices = new Algo.TupleMap<[number, number], Set<IMapData>>();

    // 1-to-1 relationships
    private readonly marketMap = new Algo.BiMap<Model.Market, Model.IMapData>();

    // 1-to-many relationships
    private readonly colonyIndustries = new Map<ColonizableT, Model.Industry[]>();
    private readonly marketSrcs = new Map<Model.Market, Model.IHasMarket[]>();
    private readonly orbitMap = new Map<ColonizableT, SatelliteT[]>();
    private tradeRoutes: Map<Model.Market, Model.Market[]>;

    // demand-supply, trade routes
    private readonly galacticDemands = new Map<Model.Product, number>();
    private readonly galacticSupplies = new Map<Model.Product, number>();
    private readonly galacticProdCap = new Map<Model.Product, number>();
    private readonly downstreamConsumers = new Algo.TupleMap<[Model.Market, Model.Market], Map<Model.Product, Model.Market[]>>();
    private readonly consumers = new Map(Model
        .allProducts()
        .map((product) => [product, new Set()] as [Model.Product, Set<Model.Market>]));
    private tradeRoutePaths: Algo.FloydWarshall<Model.Market>;
    private tradeFleets = new Algo.TupleMap<[Model.Market, Model.Market], Model.Fleet>();

    // internal variables
    private genId = -1;
    private turnCounter = -1;
    private isSettingUp = true;

    // player
    private bank = new Model.Bank();
    private playerCompany = this.addCompany();
    private numColonists = 0;
    private numTraders = 0;

    constructor(
        public readonly habitats = new Set<Model.Habitat>(),
        private companies = new Set<Model.Corporation>(),
        private governments = new Set<Model.Government>(),
        private industries = new Set<Model.Industry>(),
        private shipyards = new Set<Model.Shipyard>(),
    ) { }

    public getMarketSrcs() {
        return this.marketSrcs;
    }

    public finishSetup() {
        this.isSettingUp = false;

        this.calTradeRoutes();
    }

    public getCompany() {
        return this.playerCompany;
    }

    public getPlayerGovernment() {
        // TODO
        return this.governments.values().next().value;
    }

    public addPlanets(num: number) {
        const raws = Model.getRawMaterials();
        const numRaws = raws.length;
        const bound = num / 3;
        for (let i = 0; i < num;) {
            const coor = this.randomCoor(bound);
            if (this.getNearbyObjs(coor, 0.5).size === 0) {
                const planet = new Model.Planet(this.nextId(), raws[i % numRaws]);
                this.addObj(planet, coor);
                ++i;
            }
        }
    }

    /*
    public addShip(
        kind: Model.ShipKind,
        manufacturer: Model.Government,
        owner: Model.ShipOwner,
        template = manufacturer.latestShipDesign(kind),
        modules = new Map<Model.ShipModuleKind, number>(template),
    ) {
        const ship = new Model.Ship(kind, manufacturer, owner, template, modules);
        this.ships.add(ship);
        return ship;
    }
    */

    public addFleet(owner: Model.Corporation | Model.Government, at: Model.CoorT) {
        const fleet = new Model.Fleet(this.nextId(), owner);
        this.fleets.add(fleet);
        this.addObj(fleet, at);
        return fleet;
    }

    public addShipyard(at: Model.CoorT, link: ColonizableT) {

        const shipyard = new Model.Shipyard(this.nextId(), link);
        this.shipyards.add(shipyard);
        this.addObj(shipyard, at);
        const market = this.getMarket(link);

        Algo
            .getOrSet(this.marketSrcs, market, () => [])
            .push(shipyard);

        Algo
            .getOrSet(this.orbitMap, link, () => [])
            .push(shipyard);

        this.calTradeRoutes();
        return shipyard;
    }

    public getSatellite(col: ColonizableT) {
        return this.orbitMap.get(col);
    }

    public colonizePlanet(planet: Model.Planet, population: number) {
        const habitat = new Model.Habitat(this.nextId(), planet, population, new Model.Market(this.nextId()));
        const market = habitat.getMarket();
        this.marketMap.set(market, planet);

        Algo
            .getOrSet(this.marketSrcs, market, () => [])
            .push(habitat);

        this.habitats.add(habitat);
        planet.colonized(habitat);

        // naturally consumes these goods, proportional to population
        const consumerGoods = [
            Model.Product.Food,
            Model.Product.Drink,
            Model.Product.Apparel,
            Model.Product.Medicine,
            Model.Product.Accessory,
            Model.Product.Furniture,
            Model.Product.Gadget,
            Model.Product.Vehicle,
        ];
        for (const product of consumerGoods) {
            this.consumers.get(product)!.add(market);
        }

        this.calTradeRoutes();

        return habitat;
    }

    public addCompany() {
        const company = new Model.Corporation(this.nextId());
        this.companies.add(company);
        return company;
    }

    public getBank() {
        return this.bank;
    }

    public getIndustries(home: ColonizableT) {
        return Algo.getOr(this.colonyIndustries, home, () => []);
    }

    public addIndustry(productType: Model.Product, home: ColonizableT, owner: Model.Corporation) {
        const habitat = home.getColony()!;
        console.assert(habitat !== undefined);
        const inventory = habitat.getInventory(owner);
        const industry = new Model.Industry(this.nextId(), productType, habitat, inventory);
        this.industries.add(industry);

        Algo
            .getOrSet(this.colonyIndustries, home, () => [])
            .push(industry);

        inventory.addDemandSrc(industry);

        const market = this.getMarket(home);

        // add to consumer table
        for (const products of Model.Industry.getDemandProducts(productType)) {
            for (const product of products) {
                this.consumers
                    .get(product)!
                    .add(market);
            }
        }
        return industry;
    }

    public getMoney() {
        return this.bank.savingAmount(this.playerCompany);
    }

    public getNumColonists() {
        return this.numColonists;
    }

    public getNumTraders() {
        return this.numTraders;
    }

    public getBankAccounts() {
        return Algo.combineIt<Model.IBankAccount>(
            this.habitats.values(), this.companies.values());
    }

    public getMarket(src: ColonizableT) {
        const market = this.marketMap.getLeft(src)!;
        console.assert(market !== undefined);
        return market;
    }

    public getMarketLink(market: Model.Market) {
        return this.marketMap.getRight(market)!;
    }

    /**
     * Progress a tick; return true if the tick is also the start of a new turn.
     */
    public turn() {

        for (const fleet of this.fleets) {
            fleet.operate(this);
        }
        this.turnCounter = (this.turnCounter + 1) % BIG_TURN;
        if (this.turnCounter !== 0) {
            return false;
        }
        this.numColonists += 0.01;
        this.calGalacticMarketStats();
        this.bank.recalculate(this);
        for (const habitat of this.habitats) {
            habitat.recalculate(this);
        }
        for (const industry of this.industries) {
            industry.operate(this);
        }
        for (const planet of this.habitats) {
            planet.trade(this);
        }
        for (const account of this.getBankAccounts()) {
            this.bank.repay(account, this.bank.savingAmount(account));
        }
        for (const gov of this.governments) {
            gov.operate();
        }
        return true;
    }

    public getMarketCoor(market: Model.Market) {
        const mapData = this.getMarketLink(market);
        return this.getCoor(mapData);
    }

    public getCoor(obj: RouteStop) {

        if (obj.isCoor) {
            return (obj as CoorStopObj).getCoor();
        }

        const ret = this.objects.get(obj as IMapData);
        console.assert(ret !== undefined); // fix caller
        return ret!;
    }

    public getObjs() {
        return this.objects;
    }

    public getNearbyObjs(at: CoorT, radius: number, minDistance = 0) {
        const [atX, atY] = at;
        const possibleCoors: CoorT[] = [
            at, // center
            [atX - radius, atY - radius], // top-left
            [atX + radius, atY - radius], // top-right
            [atX - radius, atY + radius], // bottom-left
            [atX + radius, atY + radius], // bottom-right
        ];

        const sorted = possibleCoors
            .map((coor) => this.idxCoor(coor))
            .sort(Algo.compare2D);
        const uniq = Array.from(Algo.uniq(sorted, Algo.equal2D));
        return new Set(Array
            // get everything from the index
            .from(Algo.combineIt(...uniq.map((coor) => this.getIdx(coor).values())))
            // compare distance of every objects from the target coordinate
            .filter((obj) => {
                const coor = this.getCoor(obj);
                const dist = Algo.distance2D(coor, at);
                return dist >= minDistance && dist <= radius;
            }));
    }

    public move(obj: IMapData, to: CoorT, speed: number) {

        const finalSpeed = speed / BIG_TURN;

        const nextPos = () => {
            const at = this.objects.get(obj)!;
            console.assert(at !== undefined);

            const distanceLeft = Algo.distance2D(to, at);
            if (distanceLeft < finalSpeed) {
                // close enough
                return {
                    distTravelled: distanceLeft,
                    nowAt: to,
                };
            } else {
                // far away, keep moving
                const dir = Algo.subtract2D(to, at);
                const length = Algo.norm2D(dir);
                const displacement = [
                    dir[0] / length * finalSpeed,
                    dir[1] / length * finalSpeed] as [number, number];
                return {
                    distTravelled: length,
                    nowAt: Algo.sum2D(at, displacement),
                };
            }
        };

        const ret = nextPos();
        this.updateObj(obj, ret.nowAt);
        return ret;
    }

    public getTradeRoutes() {
        return this.tradeRoutes;
    }

    public getGalacticDemands(product: Model.Product) {
        return Algo.getQty(this.galacticDemands, product);
    }

    public getGalacticSupplies(product: Model.Product) {
        return Algo.getQty(this.galacticSupplies, product);
    }

    public getGalacticProdCap(product: Model.Product) {
        return Algo.getQty(this.galacticProdCap, product);
    }

    public getDownstreamConsumers(product: Model.Product, from: Model.Market, next: Model.Market) {

        console.assert(from !== next);

        const recal = () => new Map(Model
            // calculate downstream sources for all products
            .allProducts()
            .map((product2) => [
                product2,
                // find all downstream sources that pass through "next"
                Array
                    .from(this.getConsumers(product2))
                    .filter((endPoint) => endPoint !== from &&
                        this.nextTradeNode(from, endPoint) === next),
            ] as [Model.Product, Model.Market[]]));

        // lazily calculates all downstream sources
        const consumers = this.downstreamConsumers.getOrSet([from, next], () => recal());
        return consumers.get(product)!;
    }

    private getConsumers(product: Model.Product) {
        return this.consumers.get(product)!;
    }

    private nextTradeNode(from: Model.Market, to: Model.Market) {
        console.assert(from !== to); // caller checks this
        const ret = this.tradeRoutePaths.next(from, to);
        console.assert(ret !== undefined); // we're dealing with a MST of a complete graph -- all vertices are reachable
        return ret!;
    }

    private calGalacticMarketStats() {
        this.galacticDemands.clear();
        this.galacticProdCap.clear();
        this.galacticSupplies.clear();
        for (const market of this.marketMap.lefts()) {
            const inventory = market.getInventory();
            for (const product of Model.allProducts()) {
                const demandQty = market.getAggDemand(this, product);
                Algo.getAndSum(this.galacticDemands, product, demandQty);

                const supplyQty = inventory.getQty(product);
                Algo.getAndSum(this.galacticSupplies, product, supplyQty);

                const prodCap = market.getProdCap(this, product);
                Algo.getAndSum(this.galacticProdCap, product, prodCap);
            }
        }
    }

    private calTradeRoutes() {

        const vertices = new Set(Algo.combineIt<Model.Market>(
            this.marketMap.lefts(),
        ));

        // find a minimum spanning tree for the trade route map
        this.tradeRoutes = Algo.kruskalMST(
            vertices,
            (vertex: Model.Market) => {
                // complete graph for now
                const ret = new Set(vertices);
                ret.delete(vertex);
                return ret.values();
            },
            (a: Model.Market, b: Model.Market) => this.distance(a, b),
        );

        // pre-compute all-pair shortest paths for the trade routes
        this.tradeRoutePaths = new Algo.FloydWarshall(this.tradeRoutes,
            (a: Model.Market, b: Model.Market) => this.distance(a, b));

        this.downstreamConsumers.clear();
    }

    private distance(a: Model.Market, b: Model.Market) {
        const coorA = this.getMarketCoor(a);
        const coorB = this.getMarketCoor(b);
        return Algo.distance2D(coorA, coorB);
    }

    private addObj(obj: IMapData, coor: CoorT) {
        console.assert(!this.objects.has(obj));
        this.objects.set(obj, coor);
        this.addToIdx(obj, coor);
    }

    private updateObj(obj: IMapData, coor: CoorT) {
        this.removeFromIdx(obj);
        this.objects.set(obj, coor);
        this.addToIdx(obj, coor);
    }

    private idxCoor([x, y]: CoorT): CoorT {
        return [Math.floor(x), Math.floor(y)];
    }

    private removeFromIdx(obj: IMapData) {
        const coor = this.objects.get(obj)!;
        console.assert(coor !== undefined); // fix caller: object not exist

        const idxCoor = this.idxCoor(coor);
        const result = this.coorIndices.delete(idxCoor);
        console.assert(result, "index does not have obj");
    }

    private addToIdx(obj: IMapData, coor: CoorT) {
        const idxCoor = this.idxCoor(coor);
        const objs = this.coorIndices.getOrSet(idxCoor, () => new Set());
        console.assert(!objs.has(obj), "double-adding object to index");
        objs.add(obj);
    }

    private getIdx(at: CoorT) {
        const idxCoor = this.idxCoor(at);
        const objs = this.coorIndices.get(idxCoor);
        return objs ? objs : new Set<IMapData>();
    }

    private nextId() {
        return ++this.genId;
    }

    private randomCoor(bound: number): [number, number] {
        return [Math.random() * bound, Math.random() * bound];
    }
}

export type RouteStop = IMapData | (CoorStopObj & IMapData);

export function CoorStop(coor: Model.CoorT) {
    return new CoorStopObj(coor);
}

export enum MapDataKind {
    Planet,
    Fleet,
    Shipyard,
    Coordinates,
}

export function allMapDataKind() {
    return [
        MapDataKind.Planet,
        MapDataKind.Shipyard,
        MapDataKind.Fleet,
        MapDataKind.Coordinates,
    ];
}

export interface IMapData {
    readonly id: number;
    readonly isDockable: boolean;
    readonly isMapObject: boolean;
    readonly isCoor: boolean;
    readonly kind: MapDataKind;
}

export class CoorStopObj {

    public readonly isDockable = false;
    public readonly isMapObject = false;
    public readonly isCoor = true;
    public readonly kind = MapDataKind.Coordinates;

    constructor(
        private coor: Model.CoorT,
    ) { }

    public getCoor() {
        return this.coor;
    }
}
