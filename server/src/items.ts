import { ItemType, Item, ITEM_INFO_RECORD, itemInfoIsTool } from "webgl-test-shared/dist/items/items";
import { Settings } from "webgl-test-shared/dist/settings";

let nextAvailableID = 0;
const getUniqueID = (): number => {
   return nextAvailableID++;
}

export function createItem(itemType: ItemType, amount: number): Item {
   return new Item(itemType, amount, getUniqueID());
}

// @Incomplete
export function getItemAttackCooldown(item: Item): number {
   const itemInfo = ITEM_INFO_RECORD[item.type];
   if (itemInfoIsTool(item.type, itemInfo)) {
      return itemInfo.attackSwingTimeTicks;
   } else {
      return Settings.DEFAULT_ATTACK_COOLDOWN;
   }
}