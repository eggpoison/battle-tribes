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

export function getClickedItemSlotIdx(e: MouseEvent, width: number, height: number): number {
   // @Hack: has to be manually synced with the .item-slot width property
   const slotSize = 80 * uiZoom;
   
   let itemSlotX = Math.floor(e.layerX / slotSize);
   let itemSlotY = Math.floor(e.layerY / slotSize);
   // An 80 unit wide div (for example) will let you get a mouse event with x coord 80, so this has to clamp that case down.
   // @Cleanup: find a clever way to elide this. would be so much cleaner, even one less parameter!
   if (itemSlotX >= width) {
      itemSlotX = width - 1;
   }
   if (itemSlotY >= height) {
      itemSlotY = height - 1;
   }
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