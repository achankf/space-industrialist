import * as Immutable from "immutable";
import * as Model from ".";
import { CoorT, ILocatable, IRouteSegment, MapDataKind } from ".";
import * as Algo from "../algorithm/algorithm";
import OrderListMap from "../algorithm/order_list_map";
import OrderListSet from "../algorithm/order_list_set";
import TupleMap from "../algorithm/tuple_map";
import TupleSet from "../algorithm/tuple_set";
import { allProducts } from "./product";

const BIG_TURN = 50;
const STARTING_CAPITAL = 1000000;

interface ICoor {
    coor: Model.CoorT;
}

export interface IGalaxySaveData {
    allColonies: Model.IColony[];
    allFleets: Model.IFleet[];
    allIndustries: Model.IIndustry[];
    allInventories: Model.IInventory[];
    allPlanets: Model.IPlanet[];
    genId: number; // internal variables
    locatables: Array<(Model.ILocatable & ICoor)>;
    money: number; // player
    numColonists: number; // player
    numTraders: number; // player
    timestamp: number; // internal variables
    turnCounter: number; // internal variables
}

function toMap<T extends Model.IEntity>(it: Iterable<T>) {
    return new Map(Immutable
        .Seq(it)
        .map((v) => [v.id, v] as [number, T]));
}

export class Galaxy {

    public static createFrom(saveData: IGalaxySaveData) {
        const galaxy = new Galaxy();
        galaxy.genId = saveData.genId;
        galaxy.turnCounter = saveData.turnCounter;
        galaxy.timestamp = saveData.timestamp;
        galaxy.money = saveData.money;
        galaxy.numColonists = saveData.numColonists;
        galaxy.numTraders = saveData.numTraders;

        const coors = toMap(saveData.locatables);

        const inventories = toMap(Immutable
            .Seq(saveData.allInventories)
            .map((x) => new Model.Inventory(x.id, x.maxStorage === null ? Infinity : x.maxStorage, x.inventory)));

        const planets = toMap(Immutable
            .Seq(saveData.allPlanets)
            .map((x) => new Model.Planet(x.id, x.resource)));

        for (const planet of planets.values()) {
            const coor = coors.get(planet.id)!;
            console.assert(coor !== undefined);
            galaxy.addObj(planet, coor.coor);
        }

        const colonies = toMap(saveData.allColonies
            .map((x) => {
                const playerInventory = inventories.get(x.playerInventoryId)!;
                console.assert(playerInventory !== undefined);
                const marketInventory = inventories.get(x.marketInventoryId)!;
                console.assert(playerInventory !== undefined);
                const homePlanet = planets.get(x.homePlanetId)!;
                console.assert(homePlanet !== undefined);
                const colony = new Model.Colony(x.id, homePlanet, x.population, playerInventory, marketInventory, x.maxPopulation, x.isLockPopulation, x.powerPlanetLevel, x.powerOutputEff, x.foodHappiness, x.luxuryHappiness, x.commonHappiness);
                return colony;
            }));

        colonies.forEach((colony) => {
            galaxy.colonizePlanetHelper(colony, false);
        });
        galaxy.calTradeRoutes();

        // add industries
        saveData.allIndustries
            .map((x) => {
                const colony = colonies.get(x.colonyId)!;
                const industry = new Model.Industry(x.id, x.productType, colony, x.scale, x.operationalEff);
                return industry;
            })
            .forEach((industry) => galaxy.addIndustryHelper(industry));

        saveData.allFleets
            .forEach((x) => {
                const cargo = inventories.get(x.cargoId)!;
                console.assert(cargo !== undefined);
                const route = x.route.map((id) => {
                    const ret = colonies.get(id)!;
                    console.assert(ret !== undefined);
                    return ret;
                });
                const fleet = new Model.Fleet(x.id, cargo, route, x.routeAt, x.state, x.isRetiring);
                galaxy.addObj(fleet, coors.get(fleet.id)!.coor);
                galaxy.addTradeFleetHelper(fleet);
            });

        galaxy.calRouteFuelEff();
        galaxy.calGalacticMarketStats();
        return galaxy;
    }

    //// cached, memoized, calculated-on-the-fly tables

    // arranged into a tile grid, where object coordinates are ceiled
    private readonly coorIndices = new TupleMap<[number, number], Set<ILocatable>>();
    private tradeRoutes = new Map<Model.Colony, Model.Colony[]>();

    // demand-supply, trade routes
    private readonly galacticDemands = new Map<Model.Product, number>();
    private readonly galacticSupplies = new Map<Model.Product, number>();
    private readonly galacticProdCap = new Map<Model.Product, number>();
    private readonly downstreamConsumers = new TupleMap<[Model.Colony, Model.Colony], Map<Model.Product, Model.Colony[]>>();
    private readonly consumers = Model
        .allProducts()
        .map(() => new Set<Model.Colony>());
    private tradeRoutePaths!: Algo.FloydWarshall<Model.Colony>;
    private fleetFuelEff = new OrderListMap<Model.Colony, number>((a, b) => a.id - b.id);

    //// game entities & relationships

    // map objects & their coordinates
    private readonly colonies: Model.Colony[] = [];
    private readonly locatableCoors = new Map<ILocatable, CoorT>();
    private readonly colonyIndustries = new Map<Model.Colony, Set<Model.Industry>>();
    private readonly tradeFleets = new OrderListMap<Model.Colony, Set<Model.Fleet>>((a, b) => a.id - b.id);

    // internal variables
    private genId = -1;
    private turnCounter = -1;
    private timestamp = 1;

    // player
    private money = STARTING_CAPITAL;
    private numColonists = 5;
    private numTraders = 10;

    public serialize() {

        return {
            allColonies: this.colonies.map((x) => x.serialize()),
            allFleets: Immutable
                .Seq(Algo.combineIt(...this.tradeFleets.values()))
                .map((x) => x.serialize())
                .toArray(),
            allIndustries: Immutable
                .Seq(Algo.combineIt(...this.colonyIndustries.values()))
                .map((industry) => industry.serialize())
                .toArray(),
            allInventories: this.colonies
                .reduce((acc, x) => {
                    acc.push(x.getPlayerInventory());
                    acc.push(x.getMarketInventory());
                    return acc;
                }, [] as Model.Inventory[])
                .concat(...Immutable
                    .Seq(Algo.combineIt(...this.tradeFleets.values()))
                    .map((x) => x.getCargo()))
                .map((x) => x.serialize()),
            allPlanets: Immutable
                .Seq(this.locatableCoors.keys())
                .filter((x) => x.kind === MapDataKind.Planet)
                .map((x) => (x as Model.Planet).serialize())
                .toArray(),
            genId: this.genId,
            locatables: Immutable
                .Seq(this.locatableCoors)
                .map(([obj, coor]) => {
                    return { id: obj.id, kind: obj.kind, coor } as ILocatable & ICoor;
                })
                .toArray(),
            money: this.money,
            numColonists: this.numColonists,
            numTraders: this.numTraders,
            timestamp: this.timestamp,
            turnCounter: this.turnCounter,
        } as IGalaxySaveData;
    }

    public deposit(amount: number) {
        this.money += amount;
    }

    public withdraw(amount: number) {
        this.money -= amount;
    }

    public addPlanets(num: number, minDist: number) {
        const raws = Model.RAW_MATERIALS;
        const numRaws = raws.length;
        const bound = num / 2;

        const findCoorForPlanets = () => {

            const coors = new TupleSet<Model.CoorT>();

            // naive algorithm
            NEXT_CANDIDATE: while (coors.size() < num) {
                const candidate = this.randomCoor(bound);
                for (const coor of coors) {
                    if (Algo.distance2D(candidate, coor) < minDist) {
                        continue NEXT_CANDIDATE;
                    }
                }
                coors.add(candidate);
            }
            return coors.values();
        };
        let i = 0;
        for (const coor of findCoorForPlanets()) {
            const planet = new Model.Planet(this.nextId(), raws[i % numRaws]);
            this.addObj(planet, coor);
            ++i;
        }
        this.calTradeRoutes();
    }

    public addTradeFleet(from: Model.Colony, to: Model.Colony) {
        console.assert(this.numTraders >= 1);
        this.numTraders--;

        const fleet = new Model.Fleet(this.nextId(), this.createInventory(1000), [from, to]);
        this.addObj(fleet, this.getCoor(from));
        this.addTradeFleetHelper(fleet);

        return fleet;
    }

    public removeFleet(fleet: Model.Fleet) {

        const route = fleet.getRoute();
        console.assert(route.length === 2);
        const colony1 = route[0];
        const colony2 = route[1];

        // remove data, then the index
        const allFleets = this.tradeFleets.get(colony1, colony2)!;
        console.assert(allFleets !== undefined); // otherwise removing an nonexist object
        const isDeleted = allFleets.delete(fleet);
        console.assert(isDeleted); // otherwise removing an nonexist object

        this.removeObj(fleet);
        this.numTraders++;
    }

    public getNumUsedTraders(from: Model.Colony, to: Model.Colony) {
        const allFleets = this.tradeFleets.get(from, to);
        if (allFleets !== undefined) {
            return allFleets.size;
        }
        return 0;
    }

    public numColonies() {
        return this.colonies.length;
    }

    public hasTradeRoute(from: Model.Colony, to: Model.Colony) {
        const edges = this.tradeRoutes.get(from);
        return edges && edges.some((x) => x === to);
    }

    public colonizePlanet(planet: Model.Planet, population: number) {
        console.assert(this.numColonists >= 1);
        this.numColonists -= 1;
        const colony = new Model.Colony(this.nextId(), planet, population, this.createInventory(), this.createInventory());
        this.colonizePlanetHelper(colony);
        return colony;
    }

    public getIndustries(colony: Model.Colony) {
        return Immutable.Set(Algo.getOr(this.colonyIndustries, colony, () => new Set<Model.Industry>()));
    }

    public addIndustry(productType: Model.Product, colony: Model.Colony) {
        console.assert(colony !== undefined);
        const industry = new Model.Industry(this.nextId(), productType, colony);
        this.addIndustryHelper(industry);
        return industry;
    }

    public shutdownIndustry(colony: Model.Colony, industry: Model.Industry) {

        const industries = this.colonyIndustries.get(colony)!;
        console.assert(industries !== undefined);

        // get depended products for all industries expect the target
        const overall = Immutable
            .Seq(industries)
            .filter((industry2) => industry2 !== industry)
            .reduce((acc, industry2) => acc.union(this.getDemandedProducts(industry2)), Immutable.Set<Model.Product>());
        const depend = this.getDemandedProducts(industry);

        for (const product of depend.subtract(overall)) {
            const isDeleted = this.consumers[product].delete(colony);
            console.assert(isDeleted);
        }
        {
            const isDeleted = industries.delete(industry);
            console.assert(isDeleted);
        }
    }

    public getMoney() {
        return this.money;
    }

    public getNumColonists() {
        return this.numColonists;
    }

    public getNumUnusedTraders() {
        return this.numTraders;
    }

    public getNumColonizedPlanets() {
        return this.colonies.length;
    }

    public addTrader() {
        this.numTraders += 1;
    }

    public addColonists(growthDelta: number) {
        console.assert(growthDelta >= 0);
        this.numColonists += growthDelta / 10;
    }

    public getRouteFuelEff(from: Model.Colony, to: Model.Colony) {
        const ret = this.fleetFuelEff.get(from, to)!;
        if (ret !== undefined) {
            return ret;
        }
        return 0;
    }

    public getDay() {
        return this.timestamp % Model.YEAR_PER_TICK;
    }

    public getYear() {
        return Math.ceil(this.timestamp / Model.YEAR_PER_TICK);
    }

    public getTimestamp() {
        return this.timestamp;
    }

    public getScore() {
        console.assert(this.timestamp !== 0);
        const score = (this.money - STARTING_CAPITAL) / this.timestamp;
        if (score <= 0) {
            return 0;
        }
        return Math.round(score);
    }

    /**
     * Progress a tick; return true if the tick is also the start of a new turn.
     */
    public turn() {

        const fleets = Algo.combineIt(...this.tradeFleets.values());
        for (const fleet of fleets) {
            fleet.operate(this);
        }
        this.turnCounter = (this.turnCounter + 1) % BIG_TURN;
        if (this.turnCounter !== 0) {
            return false;
        }
        this.timestamp += 1;

        if (this.money < 0) {
            this.money *= 1 + Model.ANNUAL_INTEREST / Model.YEAR_PER_TICK;
        }

        this.calRouteFuelEff();
        this.calGalacticMarketStats();

        for (const colony of this.colonies) {
            colony.recalculate(this);
        }
        for (const industries of this.colonyIndustries.values()) {
            for (const industry of industries) {
                industry.operate(this);
            }
        }
        for (const colony of this.colonies) {
            colony.trade(this);
        }

        return true;
    }

    public getCoor(obj: Model.ILocatable | Model.Colony) {
        let ret;
        if (obj instanceof Model.Colony) {
            const planet = obj.getHomePlanet();
            ret = this.locatableCoors.get(planet);
        } else {
            ret = this.locatableCoors.get(obj);
        }
        console.assert(ret !== undefined); // fix caller
        return ret!;
    }

    public getObjs() {
        return this.locatableCoors;
    }

    public getObj(at: CoorT, kind: MapDataKind.Planet) {
        return this
            .searchNearbyObjs(at)
            .filter((x) => x.kind === kind)
            .first();
    }

    public searchNearbyObjs(at: CoorT, radius: number = 0, minDistance = 0) {
        const searchObs = () => {
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
            return Immutable
                .Seq(Algo.uniq(sorted, Algo.equal2D)) // find uniq elements from a sorted collection
                .map((coor) => this.getIdx(coor)) // extra objects from coordinates
                .reduce((acc, cur) => acc.union(cur), Immutable.Set<Model.ILocatable>()) // flatten collections
                .filter((obj) => {
                    const coor = this.getCoor(obj);
                    const dist = Algo.distance2D(coor, at);
                    return dist >= minDistance && dist <= radius;
                });
        };

        const routes = this.searchTradeRoutes(at, radius);
        const objs = searchObs();
        return objs.concat(routes);
    }

    public move(obj: ILocatable, to: CoorT, speed: number) {

        const finalSpeed = speed / BIG_TURN;

        const nextPos = () => {
            const at = this.locatableCoors.get(obj)!;
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

    public getDownstreamConsumers(product: Model.Product, from: Model.Colony, next: Model.Colony) {

        console.assert(from !== next);

        const recal = () => new Map(Model
            // calculate downstream sources for all products
            .allProducts()
            .map((product2) => [
                product2,
                // find all downstream sources that pass through "next"
                Array
                    .from(this.consumers[product2])
                    .filter((endPoint) => endPoint !== from &&
                        this.getNextTradeNode(from, endPoint) === next),
            ] as [Model.Product, Model.Colony[]]));

        // lazily calculates all downstream sources
        const consumers = this.downstreamConsumers.getOrSet([from, next], () => recal());
        const ret = consumers.get(product)!;
        console.assert(ret !== undefined);
        return ret;
    }

    public exists(obj: ILocatable) {
        return this.locatableCoors.has(obj);
    }

    private createInventory(maxStorage: number = Infinity) {
        return new Model.Inventory(this.nextId(), maxStorage);
    }

    private getNextTradeNode(from: Model.Colony, to: Model.Colony) {
        console.assert(from !== to); // caller checks this
        console.assert(this.tradeRoutePaths !== undefined);
        const ret = this.tradeRoutePaths.next(from, to);
        console.assert(ret !== undefined); // since we're dealing with the minimum spanning tree of a complete undirected graph, all vertices are reachable
        return ret!;
    }

    private calGalacticMarketStats() {
        this.galacticDemands.clear();
        this.galacticProdCap.clear();
        this.galacticSupplies.clear();
        for (const colony of this.colonies) {
            for (const product of allProducts()) {
                const demandQty = colony.getDemand(product);
                Algo.mapSum(this.galacticDemands, product, demandQty);

                const supplyQty = colony.getSupply(product);
                Algo.mapSum(this.galacticSupplies, product, supplyQty);

                const prodCap = colony.getProdCap(this, product);
                Algo.mapSum(this.galacticProdCap, product, prodCap);
            }
        }
    }

    private calTradeRoutes() {

        const distance = (a: Model.Colony, b: Model.Colony) => {
            const coorA = this.getCoor(a);
            const coorB = this.getCoor(b);
            return Algo.distance2D(coorA, coorB);
        };

        const vertices = new Set(this.colonies);

        // find a minimum spanning tree for the trade route map
        this.tradeRoutes = Algo.kruskalMST(
            vertices,
            (vertex: Model.Colony) => {
                // complete graph for now
                const ret = new Set(vertices);
                ret.delete(vertex);
                return ret.values();
            },
            (a: Model.Colony, b: Model.Colony) => distance(a, b),
        );

        // pre-compute all-pair shortest paths for the trade routes
        this.tradeRoutePaths = new Algo.FloydWarshall(this.tradeRoutes,
            (a: Model.Colony, b: Model.Colony) => distance(a, b));

        this.downstreamConsumers.clear();
    }

    private addObj(obj: ILocatable, coor: CoorT) {
        this.locatableCoors.set(obj, coor);
        this.addToIdx(obj, coor);
    }

    private updateObj(obj: ILocatable, coor: CoorT) {
        this.removeFromIdx(obj);
        this.locatableCoors.set(obj, coor);
        this.addToIdx(obj, coor);
    }

    private idxCoor([x, y]: CoorT): CoorT {
        return [Math.floor(x), Math.floor(y)];
    }

    private removeFromIdx(obj: ILocatable) {
        const coor = this.locatableCoors.get(obj)!;
        console.assert(coor !== undefined); // fix caller: object not exist

        const idxCoor = this.idxCoor(coor);
        const objs = this.coorIndices.get(idxCoor)!;
        console.assert(objs !== undefined, "existing object should be indexed");
        const isDeleted1 = objs.delete(obj);
        console.assert(isDeleted1, "index does not have obj");

        if (objs.size === 0) {
            const isDeleted2 = this.coorIndices.delete(idxCoor);
            console.assert(isDeleted2);
        }
    }

    private removeObj(obj: ILocatable) {
        this.removeFromIdx(obj);
        const isDeleted = this.locatableCoors.delete(obj);
        console.assert(isDeleted);
    }

    private addToIdx(obj: ILocatable, coor: CoorT) {
        const idxCoor = this.idxCoor(coor);
        const objs = this.coorIndices.getOrSet(idxCoor, () => new Set());
        console.assert(!objs.has(obj), "double-adding object to index");
        objs.add(obj);
    }

    private getIdx(at: CoorT) {
        const idxCoor = this.idxCoor(at);
        const ids = this.coorIndices.get(idxCoor);
        return ids ? ids : new Set<Model.ILocatable>();
    }

    private randomCoor(bound: number): [number, number] {
        return [Math.random() * bound, Math.random() * bound];
    }

    private * searchTradeRoutes(at: CoorT, radius: number) {
        const visited = new OrderListSet<Model.Colony>((c1, c2) => c1.id - c2.id);
        for (const [a, bs] of this.getTradeRoutes()) {
            const coorA = this.getCoor(a.getHomePlanet());
            for (const b of bs) {
                const coorB = this.getCoor(b.getHomePlanet());
                if (visited.has(a, b)) {
                    continue;
                }
                visited.add(a, b);

                const test = Algo.testLineSegmentCircleIntersect(coorA, coorB, at, radius);
                switch (test) {
                    case Algo.Intersection2D.Intersection:
                    case Algo.Intersection2D.Tangent:
                        yield {
                            from: coorA,
                            kind: MapDataKind.RouteSegment,
                            to: coorB,
                        } as IRouteSegment;
                }
            }
        }
    }

    private getDemandedProducts(industry: Model.Industry) {
        return Model.Industry
            .getFlatDemandProducts(industry.productType)
            .union(industry.getOpDemand().neededKinds);
    }

    private calRouteFuelEff() {
        this.fleetFuelEff.clear();
        for (const [from, tos] of this.tradeRoutes) {
            for (const to of tos) {
                this.fleetFuelEff.getOrSet(() => {
                    const fromEff = from.getPowerUsageEff(this);
                    const toEff = to.getPowerUsageEff(this);

                    return (fromEff + toEff) / 2;
                }, from, to);
            }
        }
    }

    private nextId() {
        return ++this.genId;
    }

    private colonizePlanetHelper(colony: Model.Colony, isCalTradeRoutes = true) {

        const planet = colony.getHomePlanet();

        console.assert(this.locatableCoors.get(planet) !== undefined); // sanity check

        this.colonies.push(colony);
        planet.colonized(colony);

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
            Model.Product.Fuel, // derived demand from power plants
        ];
        for (const product of consumerGoods) {
            this.consumers[product].add(colony);
        }

        if (isCalTradeRoutes) {
            this.calTradeRoutes();
        }
    }

    private addIndustryHelper(industry: Model.Industry) {

        const colony = industry.colony;

        Algo
            .getOrSet(this.colonyIndustries, colony, () => new Set())
            .add(industry);

        colony
            .getPlayerInventory()
            .addDemandSrc(industry);

        // add to consumer table
        for (const product of this.getDemandedProducts(industry)) {
            this.consumers[product].add(colony);
        }

        // clear cache, so that fleets will recalculate the downstream demands
        this.downstreamConsumers.clear();
    }

    private addTradeFleetHelper(fleet: Model.Fleet) {
        console.assert(this.locatableCoors.get(fleet) !== undefined); // sanity check
        const [from, to] = fleet.getRoute();
        console.assert(from !== undefined);
        console.assert(to !== undefined);
        const fleets = this.tradeFleets.getOrSet(() => new Set(), from, to);
        fleets.add(fleet);
    }
}
