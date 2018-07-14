import * as Immutable from "immutable";
import { add, combine, compare, defaultZero, distance, FloydWarshall, IntersectionKind, kruskalMST, norm, SortedTrie, subtract, testLineSegmentCircleIntersect, Trie, uniq } from "myalgo-ts";
import { ANNUAL_INTEREST, CoorT, IEntity, ILocatable, IRouteSegment, MapDataKind, YEAR_PER_TICK } from ".";
import { Colony, IColony } from "./colony";
import { Fleet, IFleet } from "./fleet";
import { IIndustry, Industry } from "./industry";
import { IInventory, Inventory } from "./inventory";
import { IPlanet, Planet } from "./planet";
import { allProducts, Product, RAW_MATERIALS } from "./product";

const BIG_TURN = 50;
const STARTING_CAPITAL = 1000000;

interface ICoor {
    coor: CoorT;
}

export interface IGalaxySaveData {
    allColonies: IColony[];
    allFleets: IFleet[];
    allIndustries: IIndustry[];
    allInventories: IInventory[];
    allPlanets: IPlanet[];
    genId: number; // internal variables
    locatables: Array<(ILocatable & ICoor)>;
    money: number; // player
    numColonists: number; // player
    numTraders: number; // player
    timestamp: number; // internal variables
    turnCounter: number; // internal variables
}

function toMap<T extends IEntity>(it: Iterable<T>) {
    return new Map(Immutable
        .Seq(it)
        .map((v) => [v.id, v] as [number, T]));
}

/** Use this comparator for SortedTrie */
export const colonyCmp = (a: Colony, b: Colony) => a.id - b.id;

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
            .map((x) => new Inventory(x.id, x.maxStorage === null ? Infinity : x.maxStorage, x.inventory)));

        const planets = toMap(Immutable
            .Seq(saveData.allPlanets)
            .map((x) => new Planet(x.id, x.resource)));

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
                const colony = new Colony(x.id, homePlanet, x.population, playerInventory, marketInventory, x.maxPopulation, x.isLockPopulation, x.powerPlanetLevel, x.powerOutputEff, x.foodHappiness, x.luxuryHappiness, x.commonHappiness);
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
                const industry = new Industry(x.id, x.productType, colony, x.scale, x.operationalEff);
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
                const fleet = new Fleet(x.id, cargo, route, x.routeAt, x.state, x.isRetiring);
                galaxy.addObj(fleet, coors.get(fleet.id)!.coor);
                galaxy.addTradeFleetHelper(fleet);
            });

        galaxy.calRouteFuelEff();
        galaxy.calGalacticMarketStats();
        return galaxy;
    }

    //// cached, memoized, calculated-on-the-fly tables

    // arranged into a tile grid, where object coordinates are ceiled
    private readonly coorIndices = new Trie<[number, number], Set<ILocatable>>();
    private tradeRoutes = new Map<Colony, Colony[]>();

    // demand-supply, trade routes
    private readonly galacticDemands = new Map<Product, number>();
    private readonly galacticSupplies = new Map<Product, number>();
    private readonly galacticProdCap = new Map<Product, number>();
    private downstreamConsumers = new SortedTrie<Colony, [Colony, Colony], Map<Product, Colony[]>>(colonyCmp);
    private readonly consumers = allProducts()
        .map(() => new Set<Colony>());
    private tradeRoutePaths!: FloydWarshall<Colony>;
    private fleetFuelEff = new SortedTrie<Colony, [Colony, Colony], number>(colonyCmp);

    //// game entities & relationships

    // map objects & their coordinates
    private readonly colonies: Colony[] = [];
    private readonly locatableCoors = new Map<ILocatable, CoorT>();
    private readonly colonyIndustries = new Map<Colony, Set<Industry>>();
    private readonly tradeFleets = new SortedTrie<Colony, [Colony, Colony], Set<Fleet>>(colonyCmp);

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
            allFleets: combine(...this.tradeFleets.values())
                .map((x) => x.serialize())
                .collect(),
            allIndustries: combine(...this.colonyIndustries.values())
                .map((industry) => industry.serialize())
                .collect(),
            allInventories: this.colonies
                .reduce((acc, x) => {
                    acc.push(x.getPlayerInventory());
                    acc.push(x.getMarketInventory());
                    return acc;
                }, [] as Inventory[])
                .concat(
                    ...combine(
                        ...this.tradeFleets.values())
                        .map((x) => x.getCargo()))
                .map((x) => x.serialize()),
            allPlanets: Immutable
                .Seq(this.locatableCoors.keys())
                .filter((x) => x.kind === MapDataKind.Planet)
                .map((x) => (x as Planet).serialize())
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
        const raws = RAW_MATERIALS;
        const numRaws = raws.length;
        const bound = num / 2;

        const findCoorForPlanets = () => {

            const coors = new Trie<CoorT, true>();

            // naive algorithm - repeatedly throw rocks and reject throws that are too close to existing rocks
            TRY_NEXT_COOR: while (coors.size() < num) {
                const candidate = this.randomCoor(bound);
                for (const coor of coors.keys()) {
                    if (distance(candidate, coor) < minDist) {
                        continue TRY_NEXT_COOR;
                    }
                }
                coors.set(candidate, true);
            }
            return coors.keys();
        };
        let i = 0;
        for (const coor of findCoorForPlanets()) {
            const planet = new Planet(this.nextId(), raws[i % numRaws]);
            this.addObj(planet, coor);
            ++i;
        }
        this.calTradeRoutes();
    }

    public addTradeFleet(from: Colony, to: Colony) {
        console.assert(this.numTraders >= 1);
        this.numTraders--;

        const fleet = new Fleet(this.nextId(), this.createInventory(1000), [from, to]);
        this.addObj(fleet, this.getCoor(from));
        this.addTradeFleetHelper(fleet);

        return fleet;
    }

    public removeFleet(fleet: Fleet) {

        const route = fleet.getRoute();
        console.assert(route.length === 2);
        const colony1 = route[0];
        const colony2 = route[1];

        // remove data, then the index
        const allFleets = this.tradeFleets.get([colony1, colony2])!;
        console.assert(allFleets !== undefined); // otherwise removing an nonexist object
        const isDeleted = allFleets.delete(fleet);
        console.assert(isDeleted); // otherwise removing an nonexist object

        this.removeObj(fleet);
        this.numTraders++;
    }

    public getNumUsedTraders(from: Colony, to: Colony) {
        const allFleets = this.tradeFleets.get([from, to]);
        if (allFleets !== undefined) {
            return allFleets.size;
        }
        return 0;
    }

    public numColonies() {
        return this.colonies.length;
    }

    public hasTradeRoute(from: Colony, to: Colony) {
        const edges = this.tradeRoutes.get(from);
        return edges && edges.some((x) => x === to);
    }

    public colonizePlanet(planet: Planet, population: number) {
        console.assert(this.numColonists >= 1);
        this.numColonists -= 1;
        const colony = new Colony(this.nextId(), planet, population, this.createInventory(), this.createInventory());
        this.colonizePlanetHelper(colony);
        return colony;
    }

    public getIndustries(colony: Colony) {
        return this.colonyIndustries.get(colony);
    }

    public addIndustry(productType: Product, colony: Colony) {
        console.assert(colony !== undefined);
        const industry = new Industry(this.nextId(), productType, colony);
        this.addIndustryHelper(industry);
        return industry;
    }

    public shutdownIndustry(colony: Colony, industry: Industry) {

        const industries = this.colonyIndustries.get(colony)!;
        console.assert(industries !== undefined);

        // get depended products for all industries expect the target
        const overall = Immutable
            .Seq(industries)
            .filter((industry2) => industry2 !== industry)
            .reduce((acc, industry2) => acc.union(this.getDemandedProducts(industry2)), Immutable.Set<Product>());
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

    public getRouteFuelEff(from: Colony, to: Colony) {
        const ret = this.fleetFuelEff.get([from, to])!;
        if (ret !== undefined) {
            return ret;
        }
        return 0;
    }

    public getDay() {
        return this.timestamp % YEAR_PER_TICK;
    }

    public getYear() {
        return Math.ceil(this.timestamp / YEAR_PER_TICK);
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

        const fleets = combine(...this.tradeFleets.values());
        for (const fleet of fleets) {
            fleet.operate(this);
        }
        this.turnCounter = (this.turnCounter + 1) % BIG_TURN;
        if (this.turnCounter !== 0) {
            return false;
        }
        this.timestamp += 1;

        if (this.money < 0) {
            this.money *= 1 + ANNUAL_INTEREST / YEAR_PER_TICK;
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

    public getCoor(obj: ILocatable | Colony) {
        let ret;
        if (obj instanceof Colony) {
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
                .sort(compare);
            return uniq(sorted, compare) // find uniq elements from a sorted collection
                .map((coor) => this.getIdx(coor)) // extra objects from coordinates
                .reduce((acc, cur) => acc.union(cur), Immutable.Set<ILocatable>()) // flatten collections
                .filter((obj) => {
                    const coor = this.getCoor(obj);
                    const dist = distance(coor, at);
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

            const distanceLeft = distance(to, at);
            if (distanceLeft < finalSpeed) {
                // close enough
                return {
                    distTravelled: distanceLeft,
                    nowAt: to,
                };
            } else {
                // far away, keep moving
                const dir = subtract(to, at);
                const length = norm(dir);
                const displacement = [
                    dir[0] / length * finalSpeed,
                    dir[1] / length * finalSpeed] as [number, number];
                return {
                    distTravelled: length,
                    nowAt: add(at, displacement),
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

    public getGalacticDemands(product: Product) {
        return defaultZero(this.galacticDemands.get(product));
    }

    public getGalacticSupplies(product: Product) {
        return defaultZero(this.galacticSupplies.get(product));
    }

    public getGalacticProdCap(product: Product) {
        return defaultZero(this.galacticProdCap.get(product));
    }

    public getDownstreamConsumers(product: Product, from: Colony, next: Colony) {

        console.assert(from !== next);

        const recal = () => new Map(
            // calculate downstream sources for all products
            allProducts()
                .map((product2) => [
                    product2,
                    // find all downstream sources that pass through "next"
                    Array
                        .from(this.consumers[product2])
                        .filter((endPoint) => endPoint !== from &&
                            this.getNextTradeNode(from, endPoint) === next),
                ] as [Product, Colony[]]));

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
        return new Inventory(this.nextId(), maxStorage);
    }

    private getNextTradeNode(from: Colony, to: Colony) {
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
                const oldDemandQty = defaultZero(this.galacticDemands.get(product));
                this.galacticDemands.set(product, oldDemandQty + demandQty);

                const supplyQty = colony.getSupply(product);
                const oldSupplyQty = defaultZero(this.galacticSupplies.get(product));
                this.galacticSupplies.set(product, oldSupplyQty + supplyQty);

                const prodCap = colony.getProdCap(this, product);
                const oldProdCap = defaultZero(this.galacticProdCap.get(product));
                this.galacticProdCap.set(product, oldProdCap + prodCap);
            }
        }
    }

    private calTradeRoutes() {

        const colonyDist = (a: Colony, b: Colony) => {
            const coorA = this.getCoor(a);
            const coorB = this.getCoor(b);
            return distance(coorA, coorB);
        };

        const vertices = new Set(this.colonies);

        // find a minimum spanning tree for the trade route map
        this.tradeRoutes = kruskalMST(
            vertices,
            (vertex: Colony) => {
                // complete graph for now
                const ret = new Set(vertices);
                ret.delete(vertex);
                return ret.values();
            },
            (a: Colony, b: Colony) => colonyDist(a, b),
        );

        // pre-compute all-pair shortest paths for the trade routes
        this.tradeRoutePaths = new FloydWarshall(this.tradeRoutes,
            (a: Colony, b: Colony) => colonyDist(a, b));

        this.downstreamConsumers = this.downstreamConsumers.makeEmpty();
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
        return ids ? ids : new Set<ILocatable>();
    }

    private randomCoor(bound: number): [number, number] {
        return [Math.random() * bound, Math.random() * bound];
    }

    private * searchTradeRoutes(at: CoorT, radius: number) {
        const visited = new SortedTrie<Colony, [Colony, Colony], true>(colonyCmp);
        for (const [a, bs] of this.getTradeRoutes()) {
            const coorA = this.getCoor(a.getHomePlanet());
            for (const b of bs) {
                const coorB = this.getCoor(b.getHomePlanet());
                if (visited.has([a, b])) {
                    continue;
                }
                visited.set([a, b], true);
                const test = testLineSegmentCircleIntersect(coorA, coorB, at, radius);
                switch (test) {
                    case IntersectionKind.Intersection:
                    case IntersectionKind.Tangent:
                        yield {
                            from: coorA,
                            kind: MapDataKind.RouteSegment,
                            to: coorB,
                        } as IRouteSegment;
                }
            }
        }
    }

    private getDemandedProducts(industry: Industry) {
        return Industry
            .getFlatDemandProducts(industry.productType)
            .union(industry.getOpDemand().neededKinds);
    }

    private calRouteFuelEff() {
        this.fleetFuelEff = this.fleetFuelEff.makeEmpty();
        for (const [from, tos] of this.tradeRoutes) {
            for (const to of tos) {
                this.fleetFuelEff.getOrSet([from, to], () => {
                    const fromEff = from.getPowerUsageEff(this);
                    const toEff = to.getPowerUsageEff(this);

                    return (fromEff + toEff) / 2;
                });
            }
        }
    }

    private nextId() {
        return ++this.genId;
    }

    private colonizePlanetHelper(colony: Colony, isCalTradeRoutes = true) {

        const planet = colony.getHomePlanet();

        console.assert(this.locatableCoors.get(planet) !== undefined); // sanity check

        this.colonies.push(colony);
        planet.colonized(colony);

        // naturally consumes these goods, proportional to population
        const consumerGoods = [
            Product.Food,
            Product.Drink,
            Product.Apparel,
            Product.Medicine,
            Product.Accessory,
            Product.Furniture,
            Product.Gadget,
            Product.Vehicle,
            Product.Fuel, // derived demand from power plants
        ];
        for (const product of consumerGoods) {
            this.consumers[product].add(colony);
        }

        if (isCalTradeRoutes) {
            this.calTradeRoutes();
        }
    }

    private addIndustryHelper(industry: Industry) {

        const colony = industry.colony;

        {
            let industries = this.colonyIndustries.get(colony);
            if (industries === undefined) {
                industries = new Set();
                this.colonyIndustries.set(colony, industries);
            }
            industries.add(industry);
        }

        colony
            .getPlayerInventory()
            .addDemandSrc(industry);

        // add to consumer table
        for (const product of this.getDemandedProducts(industry)) {
            this.consumers[product].add(colony);
        }

        // clear cache, so that fleets will recalculate the downstream demands
        this.downstreamConsumers = this.downstreamConsumers.makeEmpty();
    }

    private addTradeFleetHelper(fleet: Fleet) {
        console.assert(this.locatableCoors.get(fleet) !== undefined); // sanity check
        const [from, to] = fleet.getRoute();
        console.assert(from !== undefined);
        console.assert(to !== undefined);
        const fleets = this.tradeFleets.getOrSet([from, to], () => new Set());
        fleets.add(fleet);
    }
}
