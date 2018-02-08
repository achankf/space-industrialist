import * as Algo from "./algorithm/algorithm.js";
import { Game, UpdateChannel } from "./game.js";
import * as Model from "./model/model.js";
import * as View from "./view/view.js";

declare var process: any;

function createGalaxy() {
    // const building = new Industry<Product>(10);
    const galaxy = new Model.Galaxy();
    galaxy.addPlanets(20);

    /*
    const bank = new Model.Bank();
    const gov = new Model.Government();
    galaxy.addGovernment();

    const planet = galaxy.addHabitat([2.43, 2.1], gov, 10);
    const inventory = planet.getInventory(planet);
    inventory.putGoods(Model.Product.Tool, 5000);
    inventory.putGoods(Model.Product.Machine, 5000);
    inventory.putGoods(Model.Product.Crop, 5000);
    gov.addHabitat(planet);
    const planet2 = galaxy.addHabitat([1.86, 2.4], gov, 2);
    gov.addHabitat(planet2);
    const planet3 = galaxy.addHabitat([3.3, 1.8], gov, 2);
    gov.addHabitat(planet3);
    const company = new Model.Corporation();
    galaxy.addCompany(company);

    galaxy.addHabitat([-1, 1.8], gov, 2);
    galaxy.addHabitat([-2, 1.8], gov, 2);
    galaxy.addHabitat([-3, 1.8], gov, 2);

    galaxy.addHabitat([1, 1.8], gov, 2);
    galaxy.addHabitat([0.5, 1.8], gov, 2);
    galaxy.addHabitat([2, 1], gov, 2);
    galaxy.addHabitat([1.2, 1.4], gov, 2);
    galaxy.addHabitat([2, 2], gov, 2);
    */

    /*
    const max = 10;
    for (let i = 0; i < 10;) {
        const x = Math.random() * max / 3;
        const y = Math.random() * max / 3;
        if (galaxy.getNearbyObjs([x, y], 0.5).size === 0) {
            galaxy.addHabitat([x, y], gov, 2);
            ++i;
        }
    }
    */

    /*
    const industry1 = galaxy.addPrivateIndustry(Model.Product.Animal, planet, company);
    industry1.upgrade();
    const industry2 = galaxy.addPrivateIndustry(Model.Product.Food, planet, company);
    const industry3 = galaxy.addPrivateIndustry(Model.Product.Metal, planet, company);
    industry3.upgrade();
    industry3.upgrade();
    industry3.upgrade();
    industry3.upgrade();
    const industry4 = galaxy.addPrivateIndustry(Model.Product.Tool, planet, company);
    const industry5 = galaxy.addPrivateIndustry(Model.Product.Machine, planet, company);
    const industry6 = galaxy.addPrivateIndustry(Model.Product.Circuit, planet, company);
    const industry7 = galaxy.addPrivateIndustry(Model.Product.Metal, planet, company);
    const industry8 = galaxy.addPrivateIndustry(Model.Product.Computer, planet, company);
    const industry9 = galaxy.addPrivateIndustry(Model.Product.Tool, planet, company);
    const industry10 = galaxy.addPrivateIndustry(Model.Product.Circuit, planet, company);
    const industry11 = galaxy.addPrivateIndustry(Model.Product.Computer, planet, company);
    const industry12 = galaxy.addPrivateIndustry(Model.Product.Metal, planet, company);
    const industry13 = galaxy.addPrivateIndustry(Model.Product.Crop, planet, company);
    const industry14 = galaxy.addPrivateIndustry(Model.Product.Drink, planet, company);
    const industry15 = galaxy.addPrivateIndustry(Model.Product.Fiber, planet, company);
    const industry16 = galaxy.addPrivateIndustry(Model.Product.Apparel, planet, company);
    const industry17 = galaxy.addPrivateIndustry(Model.Product.Medicine, planet, company);
    const industry18 = galaxy.addPrivateIndustry(Model.Product.Chemical, planet, company);
    const industry19 = galaxy.addPrivateIndustry(Model.Product.Crop, planet, company);
    */

    /*
    const ship = new Model.Ship(Model.ShipKind.Freighter, gov, company, gov.latestShipDesign(Model.ShipKind.Freighter), gov.latestShipDesign(Model.ShipKind.Freighter));
    const fleet = galaxy.addFleet(company, galaxy.getCoor(planet), new Set([ship]));
    fleet.setRoute(planet, planet2);

    const ship2 = new Model.Ship(Model.ShipKind.Freighter, gov, company, gov.latestShipDesign(Model.ShipKind.Freighter), gov.latestShipDesign(Model.ShipKind.Freighter));
    const fleet2 = galaxy.addFleet(company, galaxy.getCoor(planet), new Set([ship2]));
    fleet2.setRoute(planet, planet3);

    const shipyard = galaxy.addShipyard(gov, [1.2, 1]);
    shipyard.orderShip(company, Model.ShipKind.Freighter);

    const ship3 = new Model.Ship(Model.ShipKind.Freighter, gov, company, gov.latestShipDesign(Model.ShipKind.Freighter), gov.latestShipDesign(Model.ShipKind.Freighter));
    const fleet3 = galaxy.addFleet(company, galaxy.getCoor(planet), new Set([ship3]));
    fleet3.setRoute(planet, shipyard);

    fleet.start();
    fleet2.start();
    fleet3.start();
    */

    galaxy.finishSetup();

    /*
    const uniqEdges = new Algo.OrderListSet<Model.IMapData>((a, b) => a.id - b.id);
    for (const [u, vs] of galaxy.getTradeRoutes()) {
        for (const v of vs) {
            uniqEdges.add(u, v);
        }
    }
    */

    /*
    for (const [u, v] of uniqEdges.values()) {
        const shipx = new Model.Ship(Model.ShipKind.Freighter, gov, company, gov.latestShipDesign(Model.ShipKind.Freighter), gov.latestShipDesign(Model.ShipKind.Freighter));
        const fleetx = galaxy.addFleet(company, galaxy.getCoor(u), new Set([shipx]));
        fleetx.setRoute(u, v);
        fleetx.start();
    }
    */

    return galaxy;
}

function main() {
    // disable right-click context menu
    document.body.oncontextmenu = () => false;

    const game = new Game(createGalaxy());

    const company = game.galaxy.addCompany();

    game.subscribe(new View.MapView(game));
    game.subscribe(new View.Menu(game));
    game.start();
    game.startRendering();
}

main();
