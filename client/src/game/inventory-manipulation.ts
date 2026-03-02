import { Inventory, ItemType } from "webgl-test-shared";

export function inventoryHasItems(inventory: Inventory): boolean {
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
         return true;
      }
   }
   return false;
}

export function countItemTypesInInventory(inventory: Inventory, itemType: ItemType): number {
   let count = 0;

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];
      if (item.type === itemType) {
         count += item.count;
      }
   }
   
   return count;
}

export function inventoriesAreDifferent(inventory1: Inventory, inventory2: Inventory): boolean {
   if (inventory1.width !== inventory2.width || inventory1.height !== inventory2.height) {
      return true;
   }

   for (let itemSlot = 1; itemSlot <= inventory1.width; itemSlot++) {
      const item1 = inventory1.getItem(itemSlot);
      const item2 = inventory2.getItem(itemSlot);

      // If one of them is null but the other isn't
      if ((item1 === null) !== (item2 === null)) {
         return true;
      }

      if (item1 !== null && item2 !== null) {
         if (item1.count !== item2.count
          || item1.id    !== item2.id
          || item1.type  !== item2.type) {
            return true;
         }
      }
   }

   return false;
}