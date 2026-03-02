import { ItemType, Item } from "battletribes-shared/items/items";

let nextAvailableID = 0;
const getUniqueID = (): number => {
   return nextAvailableID++;
}

// @Cleanup: extremely cumbersome to have to pass in "nickname" and "namer" when they aren't initally set 99% of the time.
export function createItem(itemType: ItemType, amount: number, nickname: string, namer: string): Item {
   return new Item(itemType, amount, getUniqueID(), nickname, namer);
}