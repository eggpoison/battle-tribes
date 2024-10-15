import { craftingMenuIsOpen } from "./components/game/menus/CraftingMenu";
import { setHeldItemVisualPosition } from "./components/game/HeldItem";
import { InventorySelector_inventoryIsOpen } from "./components/game/inventories/InventorySelector";
import { Inventory, InventoryName, ItemType } from "battletribes-shared/items/items";
import { InventoryComponentArray } from "./entity-components/server-components/InventoryComponent";
import Player from "./entities/Player";
import { sendItemPickupPacket, sendItemReleasePacket } from "./client/packet-creation";

const canInteractWithItemSlots = (): boolean => {
   return craftingMenuIsOpen() || InventorySelector_inventoryIsOpen();
}

export function leftClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the inventory is open
   if (!canInteractWithItemSlots()) return;

   const clickedItem = inventory.itemSlots[itemSlot];
   if (typeof clickedItem !== "undefined") {
      // Attempt to pick up the item if there isn't a held item
      const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
      const heldItemInventory = inventoryComponent.getInventory(InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (typeof heldItem === "undefined") {
         sendItemPickupPacket(entityID, inventory.name, itemSlot, clickedItem.count);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === heldItem.type) {
            sendItemReleasePacket(entityID, inventory.name, itemSlot, heldItem.count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
      const heldItemInventory = inventoryComponent.getInventory(InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (typeof heldItem !== "undefined") {
         sendItemReleasePacket(entityID, inventory.name, itemSlot, heldItem.count);
      }
   }
}

export function rightClickItemSlot(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   // Item slots can only be interacted with while the crafting menu is open
   if (!canInteractWithItemSlots()) return;

   e.preventDefault();

   const clickedItem = inventory.itemSlots[itemSlot];
   if (typeof clickedItem !== "undefined") {
      const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
      const heldItemInventory = inventoryComponent.getInventory(InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (typeof heldItem === "undefined") {
         const numItemsInSlot = clickedItem.count;
         const pickupCount = Math.ceil(numItemsInSlot / 2);

         sendItemPickupPacket(entityID, inventory.name, itemSlot, pickupCount);
   
         setHeldItemVisualPosition(e.clientX, e.clientY);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === heldItem.type) {
            sendItemReleasePacket(entityID, inventory.name, itemSlot, 1);
         }
      }
   } else {
      // There is no item in the clicked item slot
      
      const inventoryComponent = InventoryComponentArray.getComponent(Player.instance!.id);
      const heldItemInventory = inventoryComponent.getInventory(InventoryName.heldItemSlot)!;
      if (heldItemInventory.hasItem(1)) {
         // Attempt to place one of the held item into the clicked item slot
         sendItemReleasePacket(entityID, inventory.name, itemSlot, 1);
      }
   }
}

export function onItemSlotMouseDown(e: MouseEvent, entityID: number, inventory: Inventory, itemSlot: number): void {
   if (e.button === 0) {
      leftClickItemSlot(e, entityID, inventory, itemSlot);
   } else if (e.button === 2) {
      rightClickItemSlot(e, entityID, inventory, itemSlot);
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