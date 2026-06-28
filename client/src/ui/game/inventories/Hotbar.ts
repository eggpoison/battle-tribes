import { Entity } from "../../../../../shared/src/entities";
import { InventoryName } from "../../../../../shared/src/items/items";
import { TribeType } from "../../../../../shared/src/tribes";
import { assert } from "../../../../../shared/src/utils";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { playerTribe } from "../../../game/tribes";
import BackpackWireframe from "../../../images/miscellaneous/backpack-wireframe.png";
import ArmourWireframe from "../../../images/miscellaneous/armour-wireframe.png";
import GloveWireframe from "../../../images/miscellaneous/glove-wireframe.png";
import { createEntityInventoryElem, createInventoryContainer, getInventoryItemSlotElem } from "./Inventory";
import { addItemSlotPlaceholderImage, addItemSlotElemSelection, createItemSlot, makeItemSlotInteractable, removeItemSlotElemSelection } from "./ItemSlot";
import { MenuInventoryElemMap, MenuInventoryElemInfo } from "../../menus";

const enum Var {
   NUM_EQUIPMENT_SLOTS = 3
}

let hotbarElem: HTMLElement | null = null;
let hotbarInventoryElem: HTMLElement | null = null;

export function Hotbar_updateSelectedItemSlot(itemSlot: number): void {
   assert(hotbarInventoryElem !== null);

   // Remove previous selection
   const previousSelectedItemSlotElem = hotbarInventoryElem.querySelector(".selected");
   if (previousSelectedItemSlotElem) {
      removeItemSlotElemSelection(previousSelectedItemSlotElem as HTMLElement);
   }

   // Select new
   const itemSlotElem = getInventoryItemSlotElem(hotbarInventoryElem, itemSlot);
   addItemSlotElemSelection(itemSlotElem);
}

export function createHotbar(playerInstance: Entity): MenuInventoryElemMap {
   const inventoryElemMap = new Map<InventoryName, MenuInventoryElemInfo>();

   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
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
   inventoryElemMap.set(InventoryName.hotbar, {
      elem: inventoryElem,
      isItemSlotContainer: false
   });

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

   return inventoryElemMap;
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