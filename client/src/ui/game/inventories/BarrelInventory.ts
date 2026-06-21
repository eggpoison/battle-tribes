import { Entity } from "../../../../../shared/src/entities";
import { Inventory, InventoryName } from "../../../../../shared/src/items/items";
import { assert } from "../../../../../shared/src/utils";
import { InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { getSelectedEntity } from "../../../game/entity-selection";
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

export function createBarrelInventory(): void {
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

   const barrel = getSelectedEntity();
   assert(barrel !== null);
   const inventory = getBarrelInventory(barrel);
   const inventoryElem = createEntityInventoryElem(inventory, true, barrel);
   flexContainer.appendChild(inventoryElem);

   document.body.appendChild(elem);
}

export function destroyBarrelInventory(): void {
   document.getElementById("barrel-inventory")!.remove();
}