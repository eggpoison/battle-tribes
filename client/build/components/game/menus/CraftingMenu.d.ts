import { Item } from "webgl-test-shared/dist/items";
import { CraftingRecipe, CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
export declare let setCraftingMenuAvailableRecipes: (craftingRecipes: Array<CraftingRecipe>) => void;
export declare let setCraftingMenuAvailableCraftingStations: (craftingStations: Set<CraftingStation>) => void;
export declare let CraftingMenu_setCraftingMenuOutputItem: (craftingOutputItem: Item | null) => void;
export declare let CraftingMenu_setIsVisible: (newIsVisible: boolean) => void;
export declare let inventoryIsOpen: () => boolean;
declare const CraftingMenu: () => import("react/jsx-runtime").JSX.Element | null;
export default CraftingMenu;
