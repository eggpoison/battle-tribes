import { assert, Inventory, InventoryName, Item, TribeType } from "webgl-test-shared";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { playerInstance } from "../../../game/player";
import { playerTribe } from "../../../game/tribes";
import { playerActionState } from "../../../ui-state/player-action-state";
import BackpackWireframe from "../../../images/miscellaneous/backpack-wireframe.png";
import ArmourWireframe from "../../../images/miscellaneous/armour-wireframe.png";
import GloveWireframe from "../../../images/miscellaneous/glove-wireframe.png";
import { createInventory, createInventoryContainer } from "./Inventory";
import { addItemToItemSlot, createItemSlot, makeItemSlotInteractable, removeItemFromItemSlot, updateItemSlot } from "./ItemSlot";
import { hotbarFuncs } from "../../../ui-state/hotbar-funcs";

let hotbarElem: HTMLElement | null = null;
let hotbarInventoryElem: HTMLElement | null = null;

const getInventoryElem = (inventory: Inventory): HTMLElement => {
   assert(hotbarInventoryElem !== null);
   
   // @Robustness @Speed! can this be "templated" in a perfect performance scenario?
   switch (inventory.name) {
      case InventoryName.hotbar: return hotbarInventoryElem;
   }

   throw new Error();
}

const getItemSlotElem = (inventory: Inventory, itemSlot: number): HTMLElement => {
   const inventoryElem = getInventoryElem(inventory);
   return inventoryElem.children[itemSlot - 1] as HTMLElement;
}

hotbarFuncs.addItem = (inventory: Inventory, itemSlot: number, item: Item): void => {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   addItemToItemSlot(itemSlotElem, item);
}

hotbarFuncs.updateItem = (inventory: Inventory, itemSlot: number, item: Item): void => {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   updateItemSlot(itemSlotElem, item);
}

hotbarFuncs.removeItem = (inventory: Inventory, itemSlot: number): void => {
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   removeItemFromItemSlot(itemSlotElem);
}

hotbarFuncs.selectItemSlot = (inventory: Inventory, itemSlot: number): void => {
   assert(hotbarElem !== null);

   // Remove previous selection
   hotbarElem.querySelector(".selected")?.classList.remove("selected");

   // Select new
   const itemSlotElem = getItemSlotElem(inventory, itemSlot);
   itemSlotElem.classList.add("selected");
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
   leftContainer.classList.add("flex-container");
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
   middleContainer.classList.add("middle");
   hotbarElem.appendChild(middleContainer);

   hotbarInventoryElem = createInventory(hotbarInventory, true, playerInstance);
   // Always start with the first hotbar slot being selected
   (hotbarInventoryElem.firstChild as HTMLElement).classList.add("selected");
   middleContainer.appendChild(hotbarInventoryElem);

   // Right container
   const rightContainer = document.createElement("div");
   rightContainer.classList.add("flex-container");
   hotbarElem.appendChild(rightContainer);
   
   const rightInventoryContainer = createInventoryContainer(true);
   rightContainer.appendChild(rightInventoryContainer);

   const backpackSlotElem = createItemSlot();
   makeItemSlotInteractable(backpackSlotElem, playerInstance, backpackSlotInventory, 1);
   rightInventoryContainer.appendChild(backpackSlotElem);
   const armourSlotElem = createItemSlot();
   makeItemSlotInteractable(armourSlotElem, playerInstance, armourSlotInventory, 1);
   rightInventoryContainer.appendChild(armourSlotElem);
   const gloveSlotElem = createItemSlot();
   makeItemSlotInteractable(gloveSlotElem, playerInstance, gloveSlotInventory, 1);
   rightInventoryContainer.appendChild(gloveSlotElem);
}

export function hideHotbar(): void {
   assert(hotbarElem !== null);
   hotbarElem.classList.add("hidden");
}

export function showHotbar(): void {
   assert(hotbarElem !== null);
   hotbarElem.classList.remove("hidden");
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
      hotbarElem?.remove();
   });
   
   import.meta.hot.accept();
}