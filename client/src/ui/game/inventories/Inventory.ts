import { Entity, Inventory } from "../../../../../shared/src";
import { createItemSlot, makeItemSlotInteractable } from "./ItemSlot";

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

export function createInventory(inventory: Inventory, isBordered: boolean, entity: Entity): HTMLElement {
   const containerElem = createInventoryContainer(isBordered, inventory.width);
   for (let itemSlot = 1; itemSlot <= inventory.width; itemSlot++) {
      const itemSlotElem = createItemSlot();
      makeItemSlotInteractable(itemSlotElem, entity, inventory, itemSlot);
      containerElem.appendChild(itemSlotElem);
   }
   return containerElem;
}