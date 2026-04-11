import { Inventory, Item } from "../../../shared/src";

export const hotbarFuncs = {
   addItem: (() => {}) as (inventory: Inventory, itemSlot: number, item: Item) => void,
   updateItem: (() => {}) as (inventory: Inventory, itemSlot: number, item: Item) => void,
   removeItem: (() => {}) as (inventory: Inventory, itemSlot: number) => void,
   resizeInventory: (() => {}) as (inventory: Inventory) => void,
   selectItemSlot: (() => {}) as (inventory: Inventory, itemSlot: number) => void
};