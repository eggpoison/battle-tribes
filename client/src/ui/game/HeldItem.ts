import { Entity } from "../../../../shared/src/entities";
import { InventoryName } from "../../../../shared/src/items/items";
import { assert } from "../../../../shared/src/utils";
import { getInventory, InventoryComponentArray } from "../../game/entity-components/server-components/InventoryComponent";
import { cursorX, cursorY } from "../../game/event-handling";
import { MenuInventoryElemMap, MenuInventoryElemInfo } from "../menus";
import { addItemToItemSlot } from "./inventories/ItemSlot";

let rootElem: HTMLElement | null = null;

export function createHeldItemElem(playerInstance: Entity): MenuInventoryElemMap {
   const inventoryElemMap = new Map<InventoryName, MenuInventoryElemInfo>();

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const heldItem = heldItemInventory!.getItem(1);
   
   const elem = document.createElement("div");
   elem.id = "held-item";
   inventoryElemMap.set(InventoryName.heldItemSlot, {
      elem: elem,
      isItemSlotContainer: true
   });

   if (heldItem !== null) {
      addItemToItemSlot(elem, heldItem.type, heldItem.count);
   }

   // @copynpaste
   elem.style.top = cursorY + "px";
   elem.style.left = cursorX + "px";
   document.body.appendChild(elem);
   rootElem = elem;

   return inventoryElemMap;
}

export function updateHeldItemPosition(x: number, y: number): void {
   if (rootElem !== null) {
      rootElem.style.top = y + "px";
      rootElem.style.left = x + "px";
   }
}

export function destroyHeldItemElem(): void {
   assert(rootElem !== null);
   rootElem.remove();
}