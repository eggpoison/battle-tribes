import { Entity } from "../../../../../shared/src/entities";
import { Inventory, InventoryName } from "../../../../../shared/src/items/items";
import { InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { MenuInventoryElemMap, MenuInventoryElemInfo } from "../../menus";
import { createEntityInventoryElem } from "./Inventory";

// @Hack
function getBarrelInventory(barrel: Entity): Inventory {
   const inventoryComponent = InventoryComponentArray.getComponent(barrel);
   for (const inventory of inventoryComponent.inventories) {
      if (inventory.name === InventoryName.inventory) {
         return inventory;
      }
   }
   throw new Error();
}

export function createBarrelInventory(barrel: Entity): MenuInventoryElemMap {
   const inventoryElemMap = new Map<InventoryName, MenuInventoryElemInfo>();
   
   const elem = document.createElement("div");
   elem.id = "barrel-inventory";
   elem.className = "menu";

   const titleElem = document.createElement("h2");
   titleElem.className = "menu-title";
   titleElem.textContent = "Barrel";
   elem.appendChild(titleElem);

   const flexContainer = document.createElement("div");
   flexContainer.className = "flex-container center";
   elem.appendChild(flexContainer);

   const inventory = getBarrelInventory(barrel);
   const inventoryElem = createEntityInventoryElem(inventory, true, barrel);
   flexContainer.appendChild(inventoryElem);
   inventoryElemMap.set(inventory.name, {
      elem: inventoryElem,
      isItemSlotContainer: false
   });

   document.body.appendChild(elem);

   return inventoryElemMap;
}

export function destroyBarrelInventory(): void {
   document.getElementById("barrel-inventory")!.remove();
}