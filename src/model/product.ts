import * as Immutable from "immutable";

export enum Product {

    // raw materials
    Crop, // to food, chemical (seasonal high-yield harvest)
    Metal, // to vehicles, machines, weapons
    Gem, // to accessory, weapons
    Fuel, // fuel for spacecraft, power plant

    // intermediate
    Fiber, // to apparels, from crops
    Chemical, // to medicines & hulls, from any raw materials
    Circuit, // to gadgets, computers, from metals
    Computer, // from circuits

    // common goods
    Food, // generic food, from animals or crops
    Drink, // from crops
    Apparel, // from fibers
    Medicine, // from chemicals

    // luxuary
    Accessory, // from gems
    Furniture, // from fiber
    Gadget, // from computers
    Vehicle, // from metals

    // operational
    // Concrete, // construction, from metal
    Machine, // from metal and computers, used by industries
    Tool, // from metal, used for raw material production
    /*
    Supply, // from common goods

    // spacecraft component points
    Hull, // from metals & chemicals
    Laser, // from metals & gems
    Gun, // from metals & gems
    Missile, // from metals & gems
    Engine, // from metals & gems
    Shield, // from gems
    Armor, // from metals
    Countermeasure, // from metals

    // solder equipments
    Rifle, // from metals
    Uniform, // from fibers
    Saber, // from metals & gems; think light saber
    Exoskeleton, // from chemicals & fibers
    */
}

// https://github.com/Microsoft/TypeScript/issues/17198
const productKeys = Object
    .keys(Product)
    .filter((k) => typeof Product[k as any] === "number");
const productValues = productKeys
    .map((k) => Number(Product[k as any]) as Product)
    .sort((a, b) => a - b);

export const NUM_PRODUCTS = productKeys.length;

export function allProducts() {
    return productValues.slice();
}

export type RawMaterial = Product.Crop | Product.Metal | Product.Gem | Product.Fuel;
export const RAW_MATERIALS: RawMaterial[] = [
    Product.Crop,
    Product.Metal,
    Product.Gem,
    Product.Fuel,
];

export const RAW_MATERIALS_SET = new Set(RAW_MATERIALS);

function getDemandProductsHelper(productType: Product) {
    switch (productType) {
        case Product.Crop:
        case Product.Metal:
        case Product.Gem:
        case Product.Fuel:
            return [];
        case Product.Food:
            return [new Set([Product.Crop])];
        case Product.Drink:
            return [new Set([Product.Crop])];
        case Product.Apparel:
            return [new Set([Product.Fiber])];
        case Product.Medicine:
            return [new Set([Product.Chemical])];
        case Product.Fiber:
            return [new Set([Product.Crop])];
        case Product.Chemical:
            return [new Set([
                Product.Crop,
                Product.Metal,
                Product.Gem,
                Product.Fuel,
            ])];
        case Product.Circuit:
            return [new Set([Product.Metal])];
        case Product.Computer:
            return [new Set([Product.Circuit])];
        case Product.Accessory:
            return [new Set([Product.Gem])];
        case Product.Furniture:
            return [new Set([Product.Fiber])];
        case Product.Gadget:
            return [new Set([Product.Computer])];
        case Product.Vehicle:
            return [new Set([Product.Metal])];
        case Product.Machine:
            return [
                new Set([Product.Metal]),
                new Set([Product.Computer]),
            ];
        case Product.Tool:
            return [new Set([Product.Metal])];
    }
}

export const DEMAND_PRODUCTS = allProducts()
    .map((x) => getDemandProductsHelper(x));

export const FLAT_DEMAND_PRODUCTS = DEMAND_PRODUCTS
    .map((x) => Immutable.Set<Product>().union(...x));

export const SECONDARY_PRODUCTS = Immutable
    .Set(allProducts()
        .filter((product) => !RAW_MATERIALS_SET.has(product as RawMaterial) && // not raw materials
            !FLAT_DEMAND_PRODUCTS[product]
                .subtract(RAW_MATERIALS_SET)
                .isEmpty())); // and requires non raw materials to produce (e.g. fibers -> apparels, where fiber needs crops to produce but apparels don't need any raw materials)

function getOpDemand(product: Product): Product {
    switch (product) {
        case Product.Crop:
        case Product.Metal:
        case Product.Gem:
        case Product.Fuel:
            return Product.Tool;
        default: // post-processing industries
            return Product.Machine;
    }
}

export const OP_PRODUCTS: Product[] = allProducts()
    .map((x) => getOpDemand(x));

export interface IOpDemand {
    neededKinds: Set<Product>;
    qty: number;
}
