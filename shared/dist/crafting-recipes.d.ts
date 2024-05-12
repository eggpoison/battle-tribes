import { ItemSlots, ItemType, PlaceableItemType } from "./items";
export declare enum CraftingStation {
    workbench = 0,
    slime = 1,
    water = 2
}
export declare const CRAFTING_STATIONS: ReadonlyArray<CraftingStation>;
export declare const CRAFTING_STATION_ITEM_TYPE_RECORD: Partial<Record<CraftingStation, PlaceableItemType>>;
export type ItemRequirements = Partial<Record<ItemType, number>>;
export interface CraftingRecipe {
    readonly product: ItemType;
    /** Number of products created when the crafting recipe is used */
    readonly yield: number;
    readonly ingredients: ItemRequirements;
    readonly aiCraftTimeTicks: number;
    readonly craftingStation?: CraftingStation;
}
export declare const CRAFTING_RECIPES: ReadonlyArray<CraftingRecipe>;
export declare function getItemRecipe(itemType: ItemType): CraftingRecipe | null;
export declare function forceGetItemRecipe(itemType: ItemType): CraftingRecipe;
export declare function hasEnoughItems(itemSlotRecords: ReadonlyArray<ItemSlots>, requiredItems: ItemRequirements): boolean;
export type ItemTally = Partial<Record<ItemType, number>>;
export interface ProductInfo {
    readonly type: ItemType;
    readonly amountRequired: number;
}
export declare function getRecipeProductChain(itemType: ItemType, availableItems: Readonly<ItemTally>): ReadonlyArray<ProductInfo>;
