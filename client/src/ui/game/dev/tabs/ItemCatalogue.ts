import { ItemType, NUM_ITEM_TYPES } from "../../../../../../shared/src/items/items";
import CLIENT_ITEM_INFO_RECORD from "../../../../game/client-item-info";
import { createInventoryContainer, getClickedItemSlotIdx } from "../../inventories/Inventory";
import { addItemToItemSlot, createItemSlot } from "../../inventories/ItemSlot";
import { closeCurrentMenu } from "../../../menus";

const enum Var {
   WIDTH = 6
}

const updateFilteredItemTypes = (itemTypes: ItemType[], filter: string): void => {
   // @Garbage
   itemTypes.length = 0;
   for (let itemType: ItemType = 0; itemType < NUM_ITEM_TYPES; itemType++) {
      const clientItemInfo = CLIENT_ITEM_INFO_RECORD[itemType];

      if (clientItemInfo.name.toLowerCase().includes(filter)) {
         itemTypes.push(itemType);
      }
   }
}

const fillItems = (inventoryContainerElem: HTMLElement, filteredItemTypes: ItemType[]): void => {
   for (const itemType of filteredItemTypes) {
      const itemSlot = createItemSlot();
      addItemToItemSlot(itemSlot, itemType, 1);
      inventoryContainerElem.appendChild(itemSlot);
   }
   const numRows = Math.ceil(filteredItemTypes.length / Var.WIDTH);
   const numItemSlots = numRows * Var.WIDTH;
   for (let i = 0; i < numItemSlots - filteredItemTypes.length; i++) {
      const itemSlot = createItemSlot();
      inventoryContainerElem.appendChild(itemSlot);
   }
}

const onFilterKeyDown = (e: KeyboardEvent): void => {
   if (e.key === "Escape") {
      closeCurrentMenu();
      return;
   }
}

const onFilterChange = (e: Event, inventoryContainerElem: HTMLElement, filteredItemTypes: ItemType[]): void => {
   const newFilter = (e.target as HTMLInputElement).value;
   updateFilteredItemTypes(filteredItemTypes, newFilter);

   // @SPEED!!
   inventoryContainerElem.replaceChildren();
   fillItems(inventoryContainerElem, filteredItemTypes);
}

export function createItemCatalogue(slotClickCallback: (e: MouseEvent, itemType: ItemType) => void): HTMLElement {
   const itemTypes: ItemType[] = [];
   updateFilteredItemTypes(itemTypes, "");

   const itemCatalogueElem = document.createElement("div");
   itemCatalogueElem.id = "items-catalogue";
   itemCatalogueElem.className = "devmode-tab devmode-container";

   // Header
   
   const headerElem = document.createElement("div");
   headerElem.className = "flex-container";
   itemCatalogueElem.appendChild(headerElem);

   const searchInputContainer = document.createElement("div");
   headerElem.appendChild(searchInputContainer);

   const searchInput = document.createElement("input");
   searchInput.type = "text";
   searchInput.placeholder = "Search for items";
   searchInput.onkeydown = onFilterKeyDown;
   searchInput.oninput = e => { onFilterChange(e, inventoryContainerElem, itemTypes); };
   searchInputContainer.appendChild(searchInput);

   // The items

   const inventoryContainerElem = createInventoryContainer(false, Var.WIDTH);
   inventoryContainerElem.onmousedown = (e): void => {
      const idx = getClickedItemSlotIdx(e, Var.WIDTH);
      if (idx < itemTypes.length) {
         const itemType = itemTypes[idx];
         slotClickCallback(e, itemType);
      }
   };
   fillItems(inventoryContainerElem, itemTypes);
   itemCatalogueElem.appendChild(inventoryContainerElem);

   return itemCatalogueElem;
}

export function destroyItemCatalogue(itemCatalogueElem: HTMLElement): void {
   itemCatalogueElem.remove();
}

// @INCOMPLETE
//       {#if props.hasAmountInput}
//          <!-- @IncompletE??? @squeam -->
//          <!-- <input type="text" placeholder="Give amount" onkeydown={e => onFilterKeyDown(e)} onchange={e => onFilterTextboxChange(e.target.value)} /> -->
//          <input type="text" placeholder="Give amount" onkeydown={e => onFilterKeyDown(e)} />
//       {/if}
//    </div>