import * as Immutable from "immutable";
import {
  add,
  combine,
  compare,
  defaultZero,
  distance,
  FloydWarshall,
  IMyIterator,
  IntersectionKind,
  kruskalMST,
  norm,
  SortedTrie,
  subtract,
  testLineSegmentCircleIntersect,
  Trie,
  uniq,
} from "myalgo-ts";

import assert from "../utils/assert";
import getOrThrow from "../utils/getOrThrow";
import Bug from "../utils/UnreachableError";
import {
  ANNUAL_INTEREST,
  CoorT,
  IEntity,
  ILocatable,
  IRouteSegment,
  MapDataKind,
  YEAR_PER_TICK,
} from ".";
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
  locatables: Array<ILocatable & ICoor>;
  money: number; // player
  numColonists: number; // player
  numTraders: number; // player
  timestamp: number; // internal variables
  turnCounter: number; // internal variables
}

function toMap<T extends IEntity>(it: Iterable<T>): Map<number, T> {
  return new Map(
    Immutable.Seq(it).map((v): [number, T] => [v.id, v] as [number, T])
  );
}

/** Use this comparator for SortedTrie */
export const colonyCmp = (a: Colony, b: Colony): number => a.id - b.id;

export class Galaxy {
  public static createFrom(saveData: IGalaxySaveData): Galaxy {
    const galaxy = new Galaxy();
    galaxy.genId = saveData.genId;
    galaxy.turnCounter = saveData.turnCounter;
    galaxy.timestamp = saveData.timestamp;
    galaxy.money = saveData.money;
    galaxy.numColonists = saveData.numColonists;
    galaxy.numTraders = saveData.numTraders;

    const coors = toMap(saveData.locatables);

    const inventories = toMap(
      Immutable.Seq(saveData.allInventories).map(
        (x): Inventory =>
          new Inventory(
            x.id,
            x.maxStorage === null ? Infinity : x.maxStorage,
            x.inventory
          )
      )
    );

    const planets = toMap(
      Immutable.Seq(saveData.allPlanets).map(
        (x): Planet => new Planet(x.id, x.resource)
      )
    );

    for (const planet of planets.values()) {
      const coor = coors.get(planet.id);
      if (!coor) {
        throw new Bug("coor not found");
      }
      galaxy.addObj(planet, coor.coor);
    }

    const colonies = toMap(
      saveData.allColonies.map(
        (x): Colony => {
          const playerInventory = getOrThrow(
            inventories,
            x.playerInventoryId,
            "bug: playerInventory not found"
          );
          const marketInventory = getOrThrow(
            inventories,
            x.marketInventoryId,
            "bug: marketInventory not found"
          );
          const homePlanet = getOrThrow(
            planets,
            x.homePlanetId,
            "bug: homePlanet not found"
          );
          const colony = new Colony(
            x.id,
            homePlanet,
            x.population,
            playerInventory,
            marketInventory,
            x.maxPopulation,
            x.isLockPopulation,
            x.powerPlanetLevel,
            x.powerOutputEff,
            x.foodHappiness,
            x.luxuryHappiness,
            x.commonHappiness
          );
          return colony;
        }
      )
    );

    colonies.forEach((colony): void => {
      galaxy.colonizePlanetHelper(colony, false);
    });
    galaxy.calTradeRoutes();

    // add industries
    saveData.allIndustries
      .map(
        (x): Industry => {
          const colony = getOrThrow(
            colonies,
            x.colonyId,
            "bug: colony not found"
          );
          const industry = new Industry(
            x.id,
            x.productType,
            colony,
            x.scale,
            x.operationalEff
          );
          return industry;
        }
      )
      .forEach((industry): void => galaxy.addIndustryHelper(industry));

    saveData.allFleets.forEach((x): void => {
      const cargo = getOrThrow(inventories, x.cargoId, "bug: cargo not found");
      const route = x.route.map(
        (id): Colony => {
          const ret = getOrThrow(colonies, id, "bug: colony not found");
          return ret;
        }
      );
      const fleet = new Fleet(
        x.id,
        cargo,
        route,
        x.routeAt,
        x.state,
        x.isRetiring
      );
      const fleetCoor = getOrThrow(
        coors,
        fleet.id,
        "bug: fleet coor not found"
      );
      galaxy.addObj(fleet, fleetCoor.coor);
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
  private downstreamConsumers = new SortedTrie<
    Colony,
    [Colony, Colony],
    Map<Product, Colony[]>
  >(colonyCmp);
  private readonly consumers = allProducts().map(
    (): Set<Colony> => new Set<Colony>()
  );
  private tradeRoutePaths!: FloydWarshall<Colony>;
  private fleetFuelEff = new SortedTrie<Colony, [Colony, Colony], number>(
    colonyCmp
  );

  //// game entities & relationships

  // map objects & their coordinates
  private readonly colonies: Colony[] = [];
  private readonly locatableCoors = new Map<ILocatable, CoorT>();
  private readonly colonyIndustries = new Map<Colony, Set<Industry>>();
  private readonly tradeFleets = new SortedTrie<
    Colony,
    [Colony, Colony],
    Set<Fleet>
  >(colonyCmp);

  // internal variables
  private genId = -1;
  private turnCounter = -1;
  private timestamp = 1;

  // player
  private money = STARTING_CAPITAL;
  private numColonists = 5;
  private numTraders = 10;

  public serialize(): IGalaxySaveData {
    return {
      allColonies: this.colonies.map((x): IColony => x.serialize()),
      allFleets: combine(...this.tradeFleets.values())
        .map((x): IFleet => x.serialize())
        .collect(),
      allIndustries: combine(...this.colonyIndustries.values())
        .map((industry): IIndustry => industry.serialize())
        .collect(),
      allInventories: this.colonies
        .reduce((acc, x): Inventory[] => {
          acc.push(x.getPlayerInventory());
          acc.push(x.getMarketInventory());
          return acc;
        }, [] as Inventory[])
        .concat(
          ...combine(...this.tradeFleets.values()).map(
            (x): Inventory => x.getCargo()
          )
        )
        .map((x): IInventory => x.serialize()),
      allPlanets: Immutable.Seq(this.locatableCoors.keys())
        .filter((x): boolean => x.kind === MapDataKind.Planet)
        .map((x): IPlanet => (x as Planet).serialize())
        .toArray(),
      genId: this.genId,
      locatables: Immutable.Seq(this.locatableCoors)
        .map(([obj, coor]): ILocatable & ICoor => {
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

  public deposit(amount: number): void {
    this.money += amount;
  }

  public withdraw(amount: number): void {
    this.money -= amount;
  }

  public addPlanets(num: number, minDist: number): void {
    const raws = RAW_MATERIALS;
    const numRaws = raws.length;
    const bound = num / 2;

    const findCoorForPlanets = (): IMyIterator<CoorT> => {
      const coors = new Trie<CoorT, true>();

      // naive algorithm - repeatedly throw rocks and reject throws that are too close to existing rocks
      TRY_NEXT_COOR: while (coors.size < num) {
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

  public addTradeFleet(from: Colony, to: Colony): Fleet {
    assert(this.numTraders >= 1);
    this.numTraders--;

    const fleet = new Fleet(this.nextId(), this.createInventory(1000), [
      from,
      to,
    ]);
    this.addObj(fleet, this.getCoor(from));
    this.addTradeFleetHelper(fleet);

    return fleet;
  }

  public removeFleet(fleet: Fleet): void {
    const route = fleet.getRoute();
    assert(route.length === 2);
    const colony1 = route[0];
    const colony2 = route[1];

    // remove data, then the index
    const allFleets = getOrThrow(
      this.tradeFleets,
      [colony1, colony2],
      "bug: allFleets not found"
    );
    const isDeleted = allFleets.delete(fleet);
    assert(isDeleted); // otherwise removing an nonexist object

    this.removeObj(fleet);
    this.numTraders++;
  }

  public getNumUsedTraders(from: Colony, to: Colony): number {
    const allFleets = this.tradeFleets.get([from, to]);
    if (allFleets !== undefined) {
      return allFleets.size;
    }
    return 0;
  }

  public numColonies(): number {
    return this.colonies.length;
  }

  public hasTradeRoute(from: Colony, to: Colony): boolean {
    const edges = this.tradeRoutes.get(from);
    return !!edges && edges.some((x): boolean => x === to);
  }

  public colonizePlanet(planet: Planet, population: number): Colony {
    assert(this.numColonists >= 1);
    this.numColonists -= 1;
    const colony = new Colony(
      this.nextId(),
      planet,
      population,
      this.createInventory(),
      this.createInventory()
    );
    this.colonizePlanetHelper(colony);
    return colony;
  }

  public tryGetIndustries(colony: Colony): Set<Industry> | undefined {
    return this.colonyIndustries.get(colony);
  }

  public addIndustry(productType: Product, colony: Colony): Industry {
    const industry = new Industry(this.nextId(), productType, colony);
    this.addIndustryHelper(industry);
    return industry;
  }

  public shutdownIndustry(colony: Colony, industry: Industry): void {
    const industries = getOrThrow(
      this.colonyIndustries,
      colony,
      "bug: cannot get colony industy"
    );
    assert(industries !== undefined);

    // get depended products for all industries except the target
    const overall = Immutable.Seq(industries)
      .filter((industry2) => industry2 !== industry)
      .reduce(
        (acc, industry2) => acc.union(this.getDemandedProducts(industry2)),
        Immutable.Set<Product>()
      );
    const depend = this.getDemandedProducts(industry);

    for (const product of depend.subtract(overall)) {
      const isDeleted = this.consumers[product].delete(colony);
      assert(isDeleted);
    }
    {
      const isDeleted = industries.delete(industry);
      assert(isDeleted);
    }
  }

  public getMoney(): number {
    return this.money;
  }

  public getNumColonists(): number {
    return this.numColonists;
  }

  public getNumUnusedTraders(): number {
    return this.numTraders;
  }

  public getNumColonizedPlanets(): number {
    return this.colonies.length;
  }

  public calCenter(): [number, number] {
    const [minX, minY, maxX, maxY] = Immutable.Seq(this.locatableCoors)
      .filter(([locatable]) => locatable.kind === MapDataKind.Planet)
      .map(([, coor]) => coor)
      .reduce(
        ([accMinX, accMinY, accMaxX, accMaxY], [x, y]) => {
          return [
            Math.min(x, accMinX),
            Math.min(y, accMinY),
            Math.max(x, accMaxX),
            Math.max(y, accMaxY),
          ];
        },
        [0, 0, 0, 0]
      );
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  public addTrader(): void {
    this.numTraders += 1;
  }

  public addColonists(growthDelta: number): void {
    assert(growthDelta >= 0);
    this.numColonists += growthDelta / 10;
  }

  public getRouteFuelEff(from: Colony, to: Colony): number {
    const ret = this.fleetFuelEff.get([from, to]);
    if (ret !== undefined) {
      return ret;
    }
    return 0;
  }

  public getDay(): number {
    return this.timestamp % YEAR_PER_TICK;
  }

  public getYear(): number {
    return Math.ceil(this.timestamp / YEAR_PER_TICK);
  }

  public getTimestamp(): number {
    return this.timestamp;
  }

  public getScore(): number {
    assert(this.timestamp !== 0);
    const score = (this.money - STARTING_CAPITAL) / this.timestamp;
    if (score <= 0) {
      return 0;
    }
    return Math.round(score);
  }

  /**
   * Progress a tick; return true if the tick is also the start of a new turn.
   */
  public turn(): boolean {
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

  public getCoor(obj: ILocatable | Colony): CoorT {
    if (obj instanceof Colony) {
      const planet = obj.getHomePlanet();
      return getOrThrow(
        this.locatableCoors,
        planet,
        "bug: cannot get planet coor"
      );
    } else {
      return getOrThrow(
        this.locatableCoors,
        obj,
        "bug: cannot get object coor"
      );
    }
  }

  public getObjs(): Map<ILocatable, CoorT> {
    return this.locatableCoors;
  }

  public getObj(at: CoorT, kind: MapDataKind.Planet): ILocatable | undefined {
    return this.searchNearbyObjs(at)
      .filter((x) => x.kind === kind)
      .first() as ILocatable | undefined;
  }

  public searchNearbyObjs(
    at: CoorT,
    radius = 0,
    minDistance = 0
  ): Immutable.Set<ILocatable | IRouteSegment> {
    const searchObs = (): Immutable.Set<ILocatable> => {
      const [atX, atY] = at;
      const possibleCoors: CoorT[] = [
        at, // center
        [atX - radius, atY - radius], // top-left
        [atX + radius, atY - radius], // top-right
        [atX - radius, atY + radius], // bottom-left
        [atX + radius, atY + radius], // bottom-right
      ];

      const sorted = possibleCoors
        .map((coor): CoorT => this.idxCoor(coor))
        .sort(compare);
      return uniq(sorted, compare) // find uniq elements from a sorted collection
        .map((coor) => Immutable.Set(this.getIdx(coor))) // extra objects from coordinates
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

  public move(
    obj: ILocatable,
    to: CoorT,
    speed: number
  ): { distTravelled: number; nowAt: CoorT } {
    const finalSpeed = speed / BIG_TURN;

    const nextPos = (): { distTravelled: number; nowAt: CoorT } => {
      const at = getOrThrow(this.locatableCoors, obj, "bug: cannot get object");
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
          (dir[0] / length) * finalSpeed,
          (dir[1] / length) * finalSpeed,
        ] as [number, number];
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

  public getTradeRoutes(): Map<Colony, Colony[]> {
    return this.tradeRoutes;
  }

  public getGalacticDemands(product: Product): number {
    return defaultZero(this.galacticDemands.get(product));
  }

  public getGalacticSupplies(product: Product): number {
    return defaultZero(this.galacticSupplies.get(product));
  }

  public getGalacticProdCap(product: Product): number {
    return defaultZero(this.galacticProdCap.get(product));
  }

  public getDownstreamConsumers(
    product: Product,
    from: Colony,
    next: Colony
  ): Colony[] {
    assert(from !== next);

    const recal = () =>
      new Map(
        // calculate downstream sources for all products
        allProducts().map(
          (product2) =>
            [
              product2,
              // find all downstream sources that pass through "next"
              Array.from(this.consumers[product2]).filter(
                (endPoint): boolean =>
                  endPoint !== from &&
                  this.getNextTradeNode(from, endPoint) === next
              ),
            ] as [Product, Colony[]]
        )
      );

    // lazily calculates all downstream sources
    const consumers = this.downstreamConsumers.getOrSet([from, next], () =>
      recal()
    );
    return getOrThrow(
      consumers,
      product,
      "bug: cannot get downstream consumer"
    );
  }

  public exists(obj: ILocatable): boolean {
    return this.locatableCoors.has(obj);
  }

  private createInventory(maxStorage = Infinity): Inventory {
    return new Inventory(this.nextId(), maxStorage);
  }

  private getNextTradeNode(from: Colony, to: Colony): Colony {
    assert(from !== to); // caller checks this
    assert(this.tradeRoutePaths !== undefined);
    const ret = this.tradeRoutePaths.next(from, to);
    if (!ret) {
      // since we're dealing with the minimum spanning tree of a complete undirected graph, all vertices are reachable
      throw new Bug("all vertices should be reachable");
    }
    return ret;
  }

  private calGalacticMarketStats(): void {
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

  private calTradeRoutes(): void {
    const colonyDist = (a: Colony, b: Colony): number => {
      const coorA = this.getCoor(a);
      const coorB = this.getCoor(b);
      return distance(coorA, coorB);
    };

    const vertices = new Set(this.colonies);

    // find a minimum spanning tree for the trade route map
    this.tradeRoutes = kruskalMST(
      vertices,
      (vertex: Colony): IterableIterator<Colony> => {
        // complete graph for now
        const ret = new Set(vertices);
        ret.delete(vertex);
        return ret.values();
      },
      (a: Colony, b: Colony): number => colonyDist(a, b)
    );

    // pre-compute all-pair shortest paths for the trade routes
    this.tradeRoutePaths = new FloydWarshall(
      this.tradeRoutes,
      (a: Colony, b: Colony): number => colonyDist(a, b)
    );

    this.downstreamConsumers = this.downstreamConsumers.makeEmpty();
  }

  private addObj(obj: ILocatable, coor: CoorT): void {
    this.locatableCoors.set(obj, coor);
    this.addToIdx(obj, coor);
  }

  private updateObj(obj: ILocatable, coor: CoorT): void {
    this.removeFromIdx(obj);
    this.locatableCoors.set(obj, coor);
    this.addToIdx(obj, coor);
  }

  private idxCoor([x, y]: CoorT): CoorT {
    return [Math.floor(x), Math.floor(y)];
  }

  private removeFromIdx(obj: ILocatable): void {
    const coor = this.getCoor(obj);
    const idxCoor = this.idxCoor(coor);
    const objs = getOrThrow(
      this.coorIndices,
      idxCoor,
      "bug: existing object should be indexed"
    );
    const isDeleted1 = objs.delete(obj);
    assert(isDeleted1, "index does not have obj");

    if (objs.size === 0) {
      const isDeleted2 = this.coorIndices.delete(idxCoor);
      assert(isDeleted2);
    }
  }

  private removeObj(obj: ILocatable): void {
    this.removeFromIdx(obj);
    const isDeleted = this.locatableCoors.delete(obj);
    assert(isDeleted);
  }

  private addToIdx(obj: ILocatable, coor: CoorT): void {
    const idxCoor = this.idxCoor(coor);
    const objs = this.coorIndices.getOrSet(
      idxCoor,
      (): Set<ILocatable> => new Set()
    );
    assert(!objs.has(obj), "double-adding object to index");
    objs.add(obj);
  }

  private getIdx(at: CoorT): Set<ILocatable> {
    const idxCoor = this.idxCoor(at);
    const ids = this.coorIndices.get(idxCoor);
    return ids ? ids : new Set();
  }

  private randomCoor(bound: number): [number, number] {
    return [Math.random() * bound, Math.random() * bound];
  }

  private *searchTradeRoutes(
    at: CoorT,
    radius: number
  ): Generator<IRouteSegment, void, unknown> {
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

  private getDemandedProducts(industry: Industry): Immutable.Set<Product> {
    return Industry.getFlatDemandProducts(industry.productType).union(
      industry.getOpDemand().neededKinds
    );
  }

  private calRouteFuelEff(): void {
    this.fleetFuelEff = this.fleetFuelEff.makeEmpty();
    for (const [from, tos] of this.tradeRoutes) {
      for (const to of tos) {
        this.fleetFuelEff.getOrSet([from, to], (): number => {
          const fromEff = from.getPowerUsageEff(this);
          const toEff = to.getPowerUsageEff(this);

          return (fromEff + toEff) / 2;
        });
      }
    }
  }

  private nextId(): number {
    return ++this.genId;
  }

  private colonizePlanetHelper(colony: Colony, isCalTradeRoutes = true): void {
    const planet = colony.getHomePlanet();

    assert(this.locatableCoors.get(planet) !== undefined); // sanity check

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

  private addIndustryHelper(industry: Industry): void {
    const colony = industry.colony;

    {
      let industries = this.colonyIndustries.get(colony);
      if (industries === undefined) {
        industries = new Set();
        this.colonyIndustries.set(colony, industries);
      }
      industries.add(industry);
    }

    colony.getPlayerInventory().addDemandSrc(industry);

    // add to consumer table
    for (const product of this.getDemandedProducts(industry)) {
      this.consumers[product].add(colony);
    }

    // clear cache, so that fleets will recalculate the downstream demands
    this.downstreamConsumers = this.downstreamConsumers.makeEmpty();
  }

  private addTradeFleetHelper(fleet: Fleet): void {
    assert(this.locatableCoors.get(fleet) !== undefined); // sanity check
    const [from, to] = fleet.getRoute();
    assert(from !== undefined);
    assert(to !== undefined);
    const fleets = this.tradeFleets.getOrSet(
      [from, to],
      (): Set<Fleet> => new Set()
    );
    fleets.add(fleet);
  }
}
