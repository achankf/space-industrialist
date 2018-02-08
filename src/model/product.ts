
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
    Concrete, // construction, from metal
    Machine, // from metal and computers, used by industries
    Tool, // from metal, used for raw material production
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
}

export type RawProduct = Product.Crop |
    Product.Metal |
    Product.Gem |
    Product.Fuel
    ;

export type PostProduct = Product.Fiber |
    Product.Chemical |
    Product.Circuit |
    Product.Computer |
    Product.Food |
    Product.Drink |
    Product.Apparel |
    Product.Medicine |
    Product.Accessory |
    Product.Furniture |
    Product.Gadget |
    Product.Vehicle |
    Product.Concrete |
    Product.Machine |
    Product.Tool |
    Product.Supply |
    Product.Hull |
    Product.Laser |
    Product.Gun |
    Product.Missile |
    Product.Engine |
    Product.Shield |
    Product.Armor |
    Product.Countermeasure |
    Product.Rifle |
    Product.Uniform |
    Product.Saber |
    Product.Exoskeleton
    ;

// https://github.com/Microsoft/TypeScript/issues/17198
const productKeys = Object
    .keys(Product)
    .filter((k) => typeof Product[k as any] === "number");
const productValues = productKeys
    .map((k) => Number(Product[k as any]) as Product);

export const NUM_PRODUCTS = productKeys.length;

export function allProducts() {
    return productValues;
}

const ALL_RAW_MATERIALS = [
    Product.Crop,
    Product.Metal,
    Product.Gem,
    Product.Fuel,
];

export function getRawMaterials() {
    return ALL_RAW_MATERIALS;
}
