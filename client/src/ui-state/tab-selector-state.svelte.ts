import { EntitySummonPacket, EntityType, Inventory, InventoryName, NUM_INVENTORY_NAMES, TribesmanTitle } from "webgl-test-shared";

// @Hack? @Robustness
export const ENTITY_INVENTORY_NAME_RECORD: Partial<Record<EntityType, ReadonlyArray<InventoryName>>> = {
   [EntityType.tribeWarrior]: [InventoryName.hotbar, InventoryName.offhand, InventoryName.armourSlot, InventoryName.backpackSlot, InventoryName.gloveSlot],
   [EntityType.tribeWorker]: [InventoryName.hotbar, InventoryName.offhand, InventoryName.armourSlot, InventoryName.backpackSlot, InventoryName.gloveSlot]
}

let titles = $state(new Array<TribesmanTitle>());

const summonedInventories = $state(((): Record<InventoryName, Inventory> => {
   const inventories: Partial<Record<InventoryName, Inventory>> = {};

   for (let inventoryName: InventoryName = 0; inventoryName < NUM_INVENTORY_NAMES; inventoryName++) {
      const inventory = new Inventory(1, 1, inventoryName);
      inventories[inventoryName] = inventory;
   }

   return inventories as Record<InventoryName, Inventory>;
})());

let summonedTribeID = $state(0);
      
let summonPacket = $state<EntitySummonPacket>({
   position: [0, 0],
   rotation: 0,
   entityType: 0,
   summonData: {}
});

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
   },

   setSummonPacket(newSummonPacket: EntitySummonPacket): void {
      summonPacket = newSummonPacket;
   }
};