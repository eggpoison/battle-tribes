import { ItemType } from "./items";

export const COOKING_INGREDIENT_ITEM_TYPES = [ItemType.raw_beef, ItemType.meat_suit, ItemType.raw_fish, ItemType.mithrilOre] satisfies ReadonlyArray<ItemType>;
export type CookingIngredientItemType = typeof COOKING_INGREDIENT_ITEM_TYPES[number];

export const FUEL_SOURCE_ITEM_TYPES = [ItemType.wood] satisfies ReadonlyArray<ItemType>;
export type FuelSourceItemType = typeof FUEL_SOURCE_ITEM_TYPES[number];