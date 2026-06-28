import { Entity } from "../../../../../shared/src/entities";
import { Inventory } from "../../../../../shared/src/items/items";
import { uiZoom } from "../../../ui-state/debug-display-state";
import { addItemToItemSlot, createItemSlot, makeInventoryInteractable } from "./ItemSlot";

// @Speed: the CSS property set is unnecessary for inventories with a height of 1.
export function createInventoryContainer(hasBorder: boolean, inventoryWidth: number): HTMLElement {
   const containerElem = document.createElement("div");
   if (hasBorder) {
      containerElem.className = "inventory border";
   } else {
      containerElem.className = "inventory";
   }
   containerElem.style.setProperty("--width", inventoryWidth.toString());
   return containerElem;
}

export function getClickedItemSlotIdx(e: MouseEvent, width: number): number {
   // @Hack: has to be manually synced with the .item-slot width property
   const slotSize = 80 * uiZoom;
   
   const itemSlotX = Math.floor(e.layerX / slotSize);
   const itemSlotY = Math.floor(e.layerY / slotSize);
   return itemSlotY * width + itemSlotX;
}

export function createEntityInventoryElem(inventory: Inventory, isBordered: boolean, entity: Entity): HTMLElement {
   const containerElem = createInventoryContainer(isBordered, inventory.width);
   makeInventoryInteractable(containerElem, entity, inventory);
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      
      const itemSlotElem = createItemSlot();
      if (item !== undefined) {
         addItemToItemSlot(itemSlotElem, item.type, item.count);
      }
      containerElem.appendChild(itemSlotElem);
   }
   return containerElem;
}

export function getInventoryItemSlotElem(inventoryElem: HTMLElement, itemSlot: number): HTMLElement {
   return inventoryElem.children[itemSlot - 1] as HTMLElement;
}