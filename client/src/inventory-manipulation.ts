import { Inventory, Item, ItemType } from "webgl-test-shared/dist/items";
import Client from "./client/Client";
import { craftingMenuIsOpen } from "./components/game/menus/CraftingMenu";
import { setHeldItemVisualPosition } from "./components/game/HeldItem";
import { definiteGameState } from "./game-state/game-states";
import { InventorySelector_inventoryIsOpen } from "./components/game/inventories/InventorySelector";

const canInteractWithItemSlots = (): boolean => {
   return craftingMenuIsOpen() || InventorySelector_inventoryIsOpen();
}

export function leftClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the inventory is open
   if (!canInteractWithItemSlots()) return;

   const clickedItem = inventory.itemSlots[itemSlot];
   if (typeof clickedItem !== "undefined") {
      // Attempt to pick up the item if there isn't a held item
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem === "undefined") {
         Client.sendItemPickupPacket(entityID, inventory.name, itemSlot, clickedItem.count);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === heldItem.type) {
            Client.sendItemReleasePacket(entityID, inventory.name, itemSlot, heldItem.count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (typeof heldItem !== "undefined") {
         Client.sendItemReleasePacket(entityID, inventory.name, itemSlot, heldItem.count);
      }
   }
}

export function rightClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the crafting menu is open
   if (!canInteractWithItemSlots()) return;

   e.preventDefault();

   const clickedItem = inventory.itemSlots[itemSlot];
   if (typeof clickedItem !== "undefined") {
      const heldItem = definiteGameState.heldItemSlot.itemSlots[1];
      if (definiteGameState.heldItemSlot === null || typeof heldItem === "undefined") {
         const numItemsInSlot = clickedItem.count;
         const pickupCount = Math.ceil(numItemsInSlot / 2);

         Client.sendItemPickupPacket(entityID, inventory.name, itemSlot, pickupCount);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === heldItem.type) {
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

export function createInventoryFromData(inventoryData: Inventory): Inventory {
   const inventory = new Inventory(inventoryData.width, inventoryData.height, inventoryData.name);
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const item = inventoryData.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }

      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

export function updateInventoryFromData(inventory: Inventory, inventoryData: Inventory): void {
   inventory.width = inventoryData.width;
   inventory.height = inventoryData.height;

   // @Speed: As inventories and items are the same now, this can be way faster

   // Remove any items which have been removed from the inventory
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }
      
      // If it doesn't exist in the server data, remove it
      const itemData = inventoryData.itemSlots[itemSlot];
      if (typeof itemData === "undefined" || itemData.id !== item.id) {
         inventory.removeItem(itemSlot);
      }
   }

   // Add all new items from the server data
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const itemData = inventoryData.itemSlots[itemSlot];
      if (typeof itemData === "undefined") {
         continue;
      }

      // If the item doesn't exist in the inventory, add it
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined" || item.id !== itemData.id) {
         const item = new Item(itemData.type, itemData.count, itemData.id);
         inventory.addItem(item, itemSlot);
      } else {
         // Otherwise the item needs to be updated with the new server data
         item.count = itemData.count;
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

   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];
      if (item.type === itemType) {
         count += item.count;
      }
   }
   
   return count;
}