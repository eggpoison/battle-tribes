import { Inventory, ItemType } from "webgl-test-shared/dist/items";
export declare function leftClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void;
export declare function rightClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void;
export declare function updateInventoryFromData(inventory: Inventory, inventoryData: Inventory): void;
export declare function inventoryHasItems(inventory: Inventory): boolean;
export declare function countItemTypesInInventory(inventory: Inventory, itemType: ItemType): number;
