import { assert, Inventory, InventoryName, Item, TribeType } from "webgl-test-shared";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { playerInstance } from "../../../game/player";
import { playerTribe } from "../../../game/tribes";
import BackpackWireframe from "../../../images/miscellaneous/backpack-wireframe.png";
import ArmourWireframe from "../../../images/miscellaneous/armour-wireframe.png";
import GloveWireframe from "../../../images/miscellaneous/glove-wireframe.png";
import { createInventory, createInventoryContainer } from "./Inventory";
import { addItemSlotPlaceholderImage, addItemSlotSelection, addItemToItemSlot, createItemSlot, makeItemSlotInteractable, removeItemFromItemSlot, removeItemSlotSelection, updateItemSlot } from "./ItemSlot";
import { hotbarFuncs } from "../../../ui-state/hotbar-funcs";

let hotbarElem: HTMLElement | null = null;
let hotbarInventoryElem: HTMLElement | null = null;

const getInventoryElem = (inventory: Inventory): HTMLElement | null => {
   assert(hotbarInventoryElem !== null);
   
   // @Robustness @Speed! can this be "templated" in a perfect performance scenario?
   switch (inventory.name) {
      case InventoryName.hotbar: return hotbarInventoryElem;
   }

   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   return null;
}

const getItemSlotElem = (inventory: Inventory, itemSlot: number): HTMLElement | null => {
   const inventoryElem = getInventoryElem(inventory);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (inventoryElem === null) {
      return null;
   }

   return inventoryElem.children[itemSlot - 1] as HTMLElement;
}

hotbarFuncs.addItem = (inventory: Inventory, itemSlot: number, item: Item): void => {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      addItemToItemSlot(itemSlotElem, item.type, item.count);
   }
}

hotbarFuncs.updateItem = (inventory: Inventory, itemSlot: number, item: Item): void => {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      updateItemSlot(itemSlotElem, item);
   }
}

hotbarFuncs.removeItem = (inventory: Inventory, itemSlot: number): void => {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      removeItemFromItemSlot(itemSlotElem);
   }
}

hotbarFuncs.selectItemSlot = (inventory: Inventory, itemSlot: number): void => {
   assert(hotbarElem !== null);

   // Remove previous selection
   const previousSelectedItemSlotElem = hotbarElem.querySelector(".selected");
   if (previousSelectedItemSlotElem) {
      removeItemSlotSelection(previousSelectedItemSlotElem as HTMLElement);
   }

   // Select new
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      addItemSlotSelection(itemSlotElem);
   }
}

export function createHotbar(): void {
   assert(playerInstance !== null);
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);

   assert(hotbarInventory !== null);
   assert(backpackSlotInventory !== null);
   assert(armourSlotInventory !== null);
   assert(gloveSlotInventory !== null);
   
   assert(hotbarElem === null && hotbarInventoryElem === null);

   hotbarElem = document.createElement("div");
   hotbarElem.id = "hotbar";
   document.body.appendChild(hotbarElem);

   // Left container
   const leftContainer = document.createElement("div");
   leftContainer.className = "flex-container";
   hotbarElem.appendChild(leftContainer);

   for (let i = 0; i < 2; i++) {
      const paddingItemSlot = createItemSlot();
      paddingItemSlot.classList.add("invis");
      leftContainer.appendChild(paddingItemSlot);
   }

   if (playerTribe.tribeType === TribeType.barbarians) {
      assert(offhandInventory !== null);
      const offhandInventoryElem = createInventory(offhandInventory, true, playerInstance);
      leftContainer.appendChild(offhandInventoryElem);
   } else {
      // @Copynpaste?
      const emptyItemSlot = createItemSlot();
      emptyItemSlot.classList.add("invis");
      leftContainer.appendChild(emptyItemSlot);
   }

   // Middle container
   const middleContainer = document.createElement("div");
   middleContainer.className = "middle";
   hotbarElem.appendChild(middleContainer);

   hotbarInventoryElem = createInventory(hotbarInventory, true, playerInstance);
   middleContainer.appendChild(hotbarInventoryElem);

   // Always start with the first hotbar slot being selected
   addItemSlotSelection(hotbarInventoryElem.firstChild as HTMLElement);

   // Right container
   const rightContainer = document.createElement("div");
   rightContainer.className = "flex-container";
   hotbarElem.appendChild(rightContainer);
   
   const NUM_EQUIPMENT_SLOTS = 3;
   
   const rightInventoryContainer = createInventoryContainer(true, NUM_EQUIPMENT_SLOTS);
   rightContainer.appendChild(rightInventoryContainer);

   const backpackSlotElem = createItemSlot();
   makeItemSlotInteractable(backpackSlotElem, playerInstance, backpackSlotInventory, 1);
   addItemSlotPlaceholderImage(backpackSlotElem, BackpackWireframe);
   rightInventoryContainer.appendChild(backpackSlotElem);

   const armourSlotElem = createItemSlot();
   makeItemSlotInteractable(armourSlotElem, playerInstance, armourSlotInventory, 1);
   addItemSlotPlaceholderImage(armourSlotElem, ArmourWireframe);
   rightInventoryContainer.appendChild(armourSlotElem);

   const gloveSlotElem = createItemSlot();
   makeItemSlotInteractable(gloveSlotElem, playerInstance, gloveSlotInventory, 1);
   addItemSlotPlaceholderImage(gloveSlotElem, GloveWireframe);
   rightInventoryContainer.appendChild(gloveSlotElem);
}

export function hideHotbar(): void {
   assert(hotbarElem !== null);
   hotbarElem.hidden = true;
}

export function showHotbar(): void {
   assert(hotbarElem !== null);
   hotbarElem.hidden = false;
}

export function destroyHotbar(): void {
   assert(hotbarElem !== null);
   hotbarElem.remove();
   hotbarElem = null;
   hotbarInventoryElem = null;
}

if (import.meta.hot) {
   if (playerInstance !== null) {
      createHotbar();
   }

   import.meta.hot.dispose(() => {
      if (hotbarElem !== null) {
         destroyHotbar();
      }
   });
   
   import.meta.hot.accept();
}