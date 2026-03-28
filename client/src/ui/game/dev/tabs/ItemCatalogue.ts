import CLIENT_ITEM_INFO_RECORD from "../../../../game/client-item-info";
import { ItemType, NUM_ITEM_TYPES } from "webgl-test-shared";
import { createInventoryContainer } from "../../inventories/Inventory";
import { addItemToItemSlot, createItemSlot } from "../../inventories/ItemSlot";
import { closeCurrentMenu } from "../../../menus";

const enum Vars {
   WIDTH = 6
}

const updateFilteredItemTypes = (itemTypes: Array<ItemType>, filter: string): void => {
   // @Garbage
   itemTypes.length = 0;
   for (let itemType: ItemType = 0; itemType < NUM_ITEM_TYPES; itemType++) {
      const clientItemInfo = CLIENT_ITEM_INFO_RECORD[itemType];

      if (clientItemInfo.name.toLowerCase().includes(filter)) {
         itemTypes.push(itemType);
      }
   }
}

// Create inventory
// const inventory = new Inventory(WIDTH, Math.ceil(itemTypes.length / WIDTH), InventoryName.devInventory);
// for (let i = 0; i < itemTypes.length; i++) {
//    const itemType = itemTypes[i];
//    const itemSlot = i + 1;
   
//    const item = new Item(itemType, 1, 0, "");
//    inventory.addItem(item, itemSlot);
// }

const fillItems = (inventoryContainerElem: HTMLElement, filteredItemTypes: Array<ItemType>): void => {
   for (const itemType of filteredItemTypes) {
      const itemSlot = createItemSlot();
      addItemToItemSlot(itemSlot, itemType, 1);
      inventoryContainerElem.appendChild(itemSlot);
   }
   const numRows = Math.ceil(filteredItemTypes.length / Vars.WIDTH);
   const numItemSlots = numRows * Vars.WIDTH;
   for (let i = 0; i < numItemSlots - filteredItemTypes.length; i++) {
      const itemSlot = createItemSlot();
      inventoryContainerElem.appendChild(itemSlot);
   }
}

const destroyItems = (inventoryContainerElem: HTMLElement): void => {
   while (inventoryContainerElem.children.length > 0) {
      inventoryContainerElem.children[0].remove();
   }
}

const onFilterKeyDown = (e: KeyboardEvent): void => {
   if (e.key === "Escape") {
      closeCurrentMenu();
      return;
   }
}

const onFilterChange = (e: Event, inventoryContainerElem: HTMLElement, filteredItemTypes: Array<ItemType>): void => {
   const newFilter = (e.target as HTMLInputElement).value;
   updateFilteredItemTypes(filteredItemTypes, newFilter);

   // @SPEED!!
   destroyItems(inventoryContainerElem);
   fillItems(inventoryContainerElem, filteredItemTypes);
}

export function createItemCatalogue(slotClickCallback: (e: MouseEvent, itemType: ItemType) => void): HTMLElement {
   const itemTypes = new Array<ItemType>();
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
   searchInput.oninput = e => onFilterChange(e, inventoryContainerElem, itemTypes);
   searchInputContainer.appendChild(searchInput);

   // The items

   const inventoryContainerElem = createInventoryContainer(false, Vars.WIDTH);
   inventoryContainerElem.onmousedown = (e): void => {
      const itemSlotX = Math.floor(e.layerX / 80);
      const itemSlotY = Math.floor(e.layerY / 80);
      const idx = itemSlotY * Vars.WIDTH + itemSlotX;

      if (idx < itemTypes.length) {
         const itemType = itemTypes[idx];
         slotClickCallback(e, itemType);
      }
   };
   itemCatalogueElem.appendChild(inventoryContainerElem);

   fillItems(inventoryContainerElem, itemTypes);

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