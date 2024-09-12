import { ItemType, Item } from "battletribes-shared/items/items";

let nextAvailableID = 0;
const getUniqueID = (): number => {
   return nextAvailableID++;
}

export function createItem(itemType: ItemType, amount: number): Item {
   return new Item(itemType, amount, getUniqueID());
}