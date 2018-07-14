import * as Immutable from "immutable";
import { allProducts, Product, RAW_MATERIALS as RAW_MATERIALS_MODEL } from "../model/product";

export const BASIC_GOODS = [Product.Food, Product.Drink, Product.Apparel, Product.Medicine]
    .map((product) => Product[product])
    .join(", ");
export const LUXURY_GOODS = [Product.Accessory, Product.Furniture, Product.Gadget, Product.Vehicle]
    .map((product) => Product[product])
    .join(", ");
export const RAW_MATERIALS = RAW_MATERIALS_MODEL
    .map((product) => Product[product])
    .join(", ");
export const SECONDARY_MATERIALS = Immutable
    .Set(allProducts())
    .subtract(RAW_MATERIALS_MODEL)
    .map((product) => Product[product])
    .join(", ");
