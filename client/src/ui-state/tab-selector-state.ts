import { EntityType } from "../../../shared/src/entities";
import { InventoryName, Inventory, NUM_INVENTORY_NAMES } from "../../../shared/src/items/items";
import { TribesmanTitle } from "../../../shared/src/titles";

// @Hack? @Robustness
export const ENTITY_INVENTORY_NAME_RECORD: Partial<Record<EntityType, ReadonlyArray<InventoryName>>> = {
   [EntityType.tribeWarrior]: [InventoryName.hotbar, InventoryName.offhand, InventoryName.armourSlot, InventoryName.backpackSlot, InventoryName.gloveSlot],
   [EntityType.tribeWorker]: [InventoryName.hotbar, InventoryName.offhand, InventoryName.armourSlot, InventoryName.backpackSlot, InventoryName.gloveSlot]
}

let titles = new Array<TribesmanTitle>();

const summonedInventories = ((): Record<InventoryName, Inventory> => {
   const inventories: Partial<Record<InventoryName, Inventory>> = {};

   for (let inventoryName: InventoryName = 0; inventoryName < NUM_INVENTORY_NAMES; inventoryName++) {
      const inventory = new Inventory(1, 1, inventoryName);
      inventories[inventoryName] = inventory;
   }

   return inventories as Record<InventoryName, Inventory>;
})();

let summonedTribeID = 0;
      
export const tabSelectorState = {
   get titles() {
      return titles;
   },
   setTitles(newTitles: Array<TribesmanTitle>): void {
      // @Garbage
      titles = newTitles;
   },

   get summonedInventories() {
      return summonedInventories
   },

   get summonedTribeID() {
      return summonedTribeID;
   },
   setSummonedTribeID(newSummonedTribeID: number): void {
      summonedTribeID = newSummonedTribeID;
   }
};