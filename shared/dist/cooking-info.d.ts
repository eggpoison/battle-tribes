import { ItemType } from "./items";
export declare const COOKING_INGREDIENT_ITEM_TYPES: (ItemType.raw_beef | ItemType.meat_suit | ItemType.raw_fish)[];
export type CookingIngredientItemType = typeof COOKING_INGREDIENT_ITEM_TYPES[number];
export declare const FUEL_SOURCE_ITEM_TYPES: ItemType.wood[];
export type FuelSourceItemType = typeof FUEL_SOURCE_ITEM_TYPES[number];
