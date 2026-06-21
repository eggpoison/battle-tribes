import { Entity } from "../../../../../shared/src/entities";
import { Inventory, InventoryName, Item } from "../../../../../shared/src/items/items";
import { TribeType } from "../../../../../shared/src/tribes";
import { assert } from "../../../../../shared/src/utils";
import { getInventory, InventoryComponent } from "../../../game/entity-components/server-components/InventoryComponent";
import { playerTribe } from "../../../game/tribes";
import BackpackWireframe from "../../../images/miscellaneous/backpack-wireframe.png";
import ArmourWireframe from "../../../images/miscellaneous/armour-wireframe.png";
import GloveWireframe from "../../../images/miscellaneous/glove-wireframe.png";
import { createEntityInventoryElem, createInventoryContainer } from "./Inventory";
import { addItemSlotPlaceholderImage, addItemSlotElemSelection, addItemToItemSlot, createItemSlot, makeItemSlotInteractable, removeItemFromItemSlot, removeItemSlotElemSelection, updateItemSlot } from "./ItemSlot";

const enum Var {
   NUM_EQUIPMENT_SLOTS = 3
}

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

export function Hotbar_addItem(inventory: Inventory, itemSlot: number, item: Item): void {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      addItemToItemSlot(itemSlotElem, item.type, item.count);
   }
}

export function Hotbar_updateItem(inventory: Inventory, itemSlot: number, item: Item): void {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      updateItemSlot(itemSlotElem, item);
   }
}

export function Hotbar_removeItem(inventory: Inventory, itemSlot: number): void {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      removeItemFromItemSlot(itemSlotElem);
   }
}

export function Hotbar_updateSelectedItemSlot(inventory: Inventory, itemSlot: number): void {
   assert(hotbarElem !== null);

   // Remove previous selection
   const previousSelectedItemSlotElem = hotbarElem.querySelector(".selected");
   if (previousSelectedItemSlotElem) {
      removeItemSlotElemSelection(previousSelectedItemSlotElem as HTMLElement);
   }

   // Select new
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   // @Hack: shouldn't try to add non-hotbar item to hotbar anyway
   if (itemSlotElem !== null) {
      addItemSlotElemSelection(itemSlotElem);
   }
}

export function createHotbar(inventoryComponent: InventoryComponent, playerInstance: Entity): void {
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);

   assert(hotbarInventory !== null);
   assert(backpackSlotInventory !== null);
   assert(armourSlotInventory !== null);
   assert(gloveSlotInventory !== null);
   
   assert(hotbarElem === null && hotbarInventoryElem === null);

   const elem = document.createElement("div");
   elem.id = "hotbar";

   // Left container
   const leftContainer = document.createElement("div");
   leftContainer.className = "flex-container";
   elem.appendChild(leftContainer);

   for (let i = 0; i < 2; i++) {
      const paddingItemSlot = document.createElement("div");
      paddingItemSlot.className = "item-slot invis";
      leftContainer.appendChild(paddingItemSlot);
   }

   if (playerTribe.tribeType === TribeType.barbarians) {
      const offhandInventory = getInventory(inventoryComponent, InventoryName.offhand);
      assert(offhandInventory !== null);

      const offhandInventoryElem = createEntityInventoryElem(offhandInventory, true, playerInstance);
      leftContainer.appendChild(offhandInventoryElem);
   } else {
      // @Copynpaste?
      const emptyItemSlot = document.createElement("div");
      emptyItemSlot.className = "item-slot invis";
      leftContainer.appendChild(emptyItemSlot);
   }

   // Actual hotbar
   const inventoryElem = createEntityInventoryElem(hotbarInventory, true, playerInstance);
   elem.appendChild(inventoryElem);

   // Always start with the first hotbar slot being selected
   addItemSlotElemSelection(inventoryElem.firstChild as HTMLElement);

   // Right container
   const rightContainer = document.createElement("div");
   rightContainer.className = "flex-container";
   elem.appendChild(rightContainer);
   
   const rightInventoryContainer = createInventoryContainer(true, Var.NUM_EQUIPMENT_SLOTS);
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

   document.body.appendChild(elem);

   hotbarElem = elem;
   hotbarInventoryElem = inventoryElem;
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