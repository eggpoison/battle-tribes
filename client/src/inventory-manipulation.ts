import { Inventory, Item, ItemType } from "webgl-test-shared/dist/items";
import Client from "./client/Client";
import { inventoryIsOpen } from "./components/game/menus/CraftingMenu";
import { setHeldItemVisualPosition } from "./components/game/HeldItem";
import { definiteGameState } from "./game-state/game-states";
import { InventorySelector_inventoryIsOpen } from "./components/game/inventories/InventorySelector";

const canInteractWithItemSlots = (): boolean => {
   return inventoryIsOpen() || InventorySelector_inventoryIsOpen();
}

export function leftClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the inventory is open
   if (!canInteractWithItemSlots()) return;

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      // There is an item in the item slot

      const clickedItem = inventory.itemSlots[itemSlot];

      // Attempt to pick up the item if there isn't a held item
      if (!definiteGameState.heldItemSlot!.itemSlots.hasOwnProperty(1)) {
         Client.sendItemPickupPacket(entityID, inventory.name, itemSlot, clickedItem.count);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === definiteGameState.heldItemSlot!.itemSlots[1].type) {
            Client.sendItemReleasePacket(entityID, inventory.name, itemSlot, definiteGameState.heldItemSlot!.itemSlots[1].count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      if (definiteGameState.heldItemSlot!.itemSlots.hasOwnProperty(1)) {
         Client.sendItemReleasePacket(entityID, inventory.name, itemSlot, definiteGameState.heldItemSlot!.itemSlots[1].count);
      }
   }
}

export function rightClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the crafting menu is open
   if (!canInteractWithItemSlots()) return;

   e.preventDefault();

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      const clickedItem = inventory.itemSlots[itemSlot];

      if (definiteGameState.heldItemSlot === null || !definiteGameState.heldItemSlot.itemSlots.hasOwnProperty(1)) {
         const numItemsInSlot = clickedItem.count;
         const pickupCount = Math.ceil(numItemsInSlot / 2);

         Client.sendItemPickupPacket(entityID, inventory.name, itemSlot, pickupCount);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === definiteGameState.heldItemSlot.itemSlots[1].type) {
            Client.sendItemReleasePacket(entityID, inventory.name, itemSlot, 1);
         }
      }
   } else {
      // There is no item in the clicked item slot
      
      if (definiteGameState.heldItemSlot !== null) {
         // Attempt to place one of the held item into the clicked item slot
         Client.sendItemReleasePacket(entityID, inventory.name, itemSlot, 1);
      }
   }
}

export function updateInventoryFromData(inventory: Inventory, inventoryData: Inventory): void {
   inventory.width = inventoryData.width;
   inventory.height = inventoryData.height;

   // @Speed: As inventories and items are the same now, this can be way faster

   // Remove any items which have been removed from the inventory
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (!inventory.itemSlots.hasOwnProperty(itemSlot)) {
         continue;
      }
      
      // If it doesn't exist in the server data, remove it
      const item = inventory.itemSlots[itemSlot];
      if (!inventoryData.itemSlots.hasOwnProperty(itemSlot) || inventoryData.itemSlots[itemSlot].id !== item.id) {
         delete inventory.itemSlots[itemSlot];
      }
   }

   // Add all new items from the server data
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      if (!inventoryData.itemSlots.hasOwnProperty(itemSlot)) {
         continue;
      }

      // If the item doesn't exist in the inventory, add it
      const itemData = inventoryData.itemSlots[itemSlot];
      if (!inventory.itemSlots.hasOwnProperty(itemSlot) || inventory.itemSlots[itemSlot].id !== itemData.id) {
         inventory.itemSlots[itemSlot] = new Item(itemData.type, itemData.count, itemData.id);
      } else {
         // Otherwise the item needs to be updated with the new server data
         inventory.itemSlots[itemSlot].count = itemData.count;
      }
   }
}

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

   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
         const item = inventory.itemSlots[itemSlot];
         if (item.type === itemType) {
            count += item.count;
         }
      }
   }
   
   return count;
}