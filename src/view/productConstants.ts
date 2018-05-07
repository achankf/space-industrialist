import * as Immutable from "immutable";
import * as Model from "../model";
import { allProducts, Product } from "../model/product";

export const BASIC_GOODS = [Product.Food, Product.Drink, Product.Apparel, Product.Medicine]
    .map((product) => Product[product])
    .join(", ");
export const LUXURY_GOODS = [Product.Accessory, Product.Furniture, Product.Gadget, Product.Vehicle]
    .map((product) => Product[product])
    .join(", ");
export const RAW_MATERIALS = Model.RAW_MATERIALS
    .map((product) => Product[product])
    .join(", ");
export const SECONDARY_MATERIALS = Immutable
    .Set(allProducts())
    .subtract(Model.RAW_MATERIALS)
    .map((product) => Product[product])
    .join(", ");
