import { assert, Entity, Inventory, InventoryName, Item } from "../../../../../shared/src";
import { getItemTypeImage } from "../../../game/client-item-info";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { keyIsPressed } from "../../../game/keyboard-input";
import { sendItemTransferPacket, sendItemPickupPacket, sendItemReleasePacket } from "../../../game/networking/packet-sending/packet-sending";
import { playerInstance } from "../../../game/player";
import { entitySelectionState } from "../../../ui-state/entity-selection-state";
import { menuSelectorState, Menu } from "../../../ui-state/menu-selector-state";

// interface Props extends HTMLAttributes<HTMLDivElement> {
//    item: Item | null;
//    isSelected?: boolean;
//    placeholderImg?: any;
//    restTime?: ItemRestTime;
//    onmousedown?(e: MouseEvent): void;
//    onmouseover?(e: MouseEvent): void;
//    onmouseout?(e: MouseEvent): void;
//    onmousemove?(e: MouseEvent): void;
//    oncontextmenu?(e: MouseEvent): void;
// }

// let { item, isSelected, placeholderImg, restTime, onmousedown, onmouseover, onmouseout, onmousemove, oncontextmenu, ...rest }: Props = $props();

// const img = $derived(item !== null ? getItemTypeImage(item.type) : placeholderImg);

// let isShowingTooltip = $state(false);

// const onMouseOver = (e: MouseEvent): void => {
//    onmouseover?.(e);

//    itemTooltipState.setItem(item);
//    isShowingTooltip = true;
// }

// const onMouseMove = (e: MouseEvent): void => {
//    onmousemove?.(e);
// }

// const onMouseOut = (e: MouseEvent): void => {
//    onmouseout?.(e);
//    isShowingTooltip = false;

//    // @Bug? what if this overrides it?
//    itemTooltipState.setItem(null);
// }

// onDestroy(() => {
//    // If the player is hovering over the item when the menu is closed, the onMouseOut function won't be triggered, so we have to also clear the item tooltip when it's destroyed
//    if (isShowingTooltip) {
//       itemTooltipState.setItem(null);
//    }
// });

const leftClickItemSlot = (entity: Entity, inventory: Inventory, itemSlot: number): void => {
   let openMenuInventory: Inventory | null;
   let openMenuEntity: Entity | null;

   if (menuSelectorState.menuStack.length === 1) {
      const menuInfo = menuSelectorState.menuStack[0];
      // @HACK
      switch (menuInfo.menu) {
         case Menu.buildMenu: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.animalStaffOptions: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.craftingMenu: openMenuInventory = getInventory(InventoryComponentArray.getComponent(playerInstance!), InventoryName.craftingOutputSlot); openMenuEntity = playerInstance!; break;
         case Menu.tamingMenu: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.tamingRenamePrompt: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.signInscribeMenu: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.barrelInventory: openMenuInventory = getInventory(InventoryComponentArray.getComponent(entitySelectionState.selectedEntity!), InventoryName.inventory); openMenuEntity = entitySelectionState.selectedEntity!; break;
         case Menu.tribesmanInventory: openMenuInventory = getInventory(InventoryComponentArray.getComponent(entitySelectionState.selectedEntity!), InventoryName.hotbar); openMenuEntity = entitySelectionState.selectedEntity!; break;
         case Menu.campfireInventory: openMenuInventory = getInventory(InventoryComponentArray.getComponent(entitySelectionState.selectedEntity!), InventoryName.inventory); openMenuEntity = entitySelectionState.selectedEntity!; break;
         case Menu.furnaceInventory: openMenuInventory = getInventory(InventoryComponentArray.getComponent(entitySelectionState.selectedEntity!), InventoryName.inventory); openMenuEntity = entitySelectionState.selectedEntity!; break;
         case Menu.ammoBoxInventory: openMenuInventory = getInventory(InventoryComponentArray.getComponent(entitySelectionState.selectedEntity!), InventoryName.inventory); openMenuEntity = entitySelectionState.selectedEntity!; break;
         case Menu.tombstoneEpitaph: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.itemsDevTab: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.summonDevTab: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.titlesDevTab: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.tribesDevTab: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.tribePlanVisualiser: openMenuInventory = null; openMenuEntity = null; break;
         case Menu.techTree: openMenuInventory = null; openMenuEntity = null; break;
      }
   } else {
      openMenuInventory = null;
      openMenuEntity = null;
   }

   let otherOpenMenuInventory: Inventory | null;
   let otherOpenMenuEntity: Entity | null;
   if (openMenuEntity === entity) {
      const playerInventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      otherOpenMenuInventory = getInventory(playerInventoryComponent, InventoryName.hotbar);
      otherOpenMenuEntity = playerInstance!;
   } else {
      otherOpenMenuInventory = openMenuInventory;
      otherOpenMenuEntity = openMenuEntity;
   }

   const clickedItem = inventory.itemSlots[itemSlot];
   if (typeof clickedItem !== "undefined") {
      // Attempt to pick up the item if there isn't a held item
      const playerInventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (typeof heldItem === "undefined") {
         // If shift is held, insta-send the item between the player's inventory and the opened inventory
         if (keyIsPressed("shift")) {
            if (otherOpenMenuInventory !== null && otherOpenMenuEntity !== null) {
               if (entity === playerInstance) {
                  // Clicked hte player inventory, so transfer to the open menu
                  sendItemTransferPacket(entity, inventory.name, itemSlot, otherOpenMenuEntity, otherOpenMenuInventory.name);
               } else {
                  // Clicked the open menu inventory, so transfer to the player inventory
                  sendItemTransferPacket(entity, inventory.name, itemSlot, otherOpenMenuEntity, otherOpenMenuInventory.name);
               }
            }
         } else {
            sendItemPickupPacket(entity, inventory.name, itemSlot, clickedItem.count);
         }
      } else {
         // If both the held item and the clicked item are of the same type, attempt to add the held item to the clicked item
         if (clickedItem.type === heldItem.type) {
            sendItemReleasePacket(entity, inventory.name, itemSlot, heldItem.count);
         }
      }
   } else {
      // There is no item in the item slot

      // Attempt to release the held item into the item slot if there is a held item
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (typeof heldItem !== "undefined") {
         sendItemReleasePacket(entity, inventory.name, itemSlot, heldItem.count);
      }
   }
}

const rightClickItemSlot = (entity: Entity, inventory: Inventory, itemSlot: number): void => {
   const clickedItem = inventory.itemSlots[itemSlot];
   if (typeof clickedItem !== "undefined") {
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (typeof heldItem === "undefined") {
         const numItemsInSlot = clickedItem.count;
         const pickupCount = Math.ceil(numItemsInSlot / 2);

         sendItemPickupPacket(entity, inventory.name, itemSlot, pickupCount);
      } else {
         // If both the held item and the clicked item are of the same type, attempt to drop 1 of the held item
         if (clickedItem.type === heldItem.type) {
            sendItemReleasePacket(entity, inventory.name, itemSlot, 1);
         }
      }
   } else {
      // There is no item in the clicked item slot
      
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
      if (heldItemInventory.hasItem(1)) {
         // Attempt to place one of the held item into the clicked item slot
         sendItemReleasePacket(entity, inventory.name, itemSlot, 1);
      }
   }
}

const inventoryIsFocused = (): boolean => {
   return menuSelectorState.hasOpenMenu();
}

const onMouseDown = (e: MouseEvent, entity: Entity, inventory: Inventory, itemSlot: number): void => {
   if (!inventoryIsFocused()) {
      return;
   }
   
   if (e.button === 0) {
      leftClickItemSlot(entity, inventory, itemSlot);
   } else if (e.button === 2) {
      rightClickItemSlot(entity, inventory, itemSlot);
   }
}

export function createItemSlot(): HTMLDivElement {
   const itemSlotElem = document.createElement("div");
   itemSlotElem.classList.add("item-slot");
   return itemSlotElem;
}

export function makeItemSlotInteractable(itemSlotElem: HTMLElement, entity: Entity, inventory: Inventory, itemSlot: number): void {
   itemSlotElem.addEventListener("mousedown", e => { onMouseDown(e, entity, inventory, itemSlot); });
}

export function addItemToItemSlot(itemSlotElem: HTMLElement, item: Item): void {
   const img = getItemTypeImage(item.type);

   const imgElem = document.createElement("img");
   imgElem.src = img;
   imgElem.draggable = false;
   itemSlotElem.appendChild(imgElem);

   const itemCountElem = document.createElement("div");
   itemCountElem.classList.add("item-count");
   // I'm thinking it will create less garbage to always create text for items, even if they are only stacked to one.
   itemCountElem.textContent = item.count.toString();
   if (item.count === 1) {
      itemCountElem.classList.add("hidden");
   }
   itemSlotElem.appendChild(itemCountElem);
}

export function updateItemSlot(itemSlotElem: HTMLElement, item: Item): void {
   const itemCountElem = itemSlotElem.children[1];
   if (item.count !== -1) {
      itemCountElem.classList.remove("hidden");
      (itemCountElem.firstChild as Text).data = item.count.toString();
   } else {
      itemCountElem.classList.add("hidden");
   }
}

export function removeItemFromItemSlot(itemSlotElem: HTMLElement): void {
   assert(itemSlotElem.children.length === 2);
   itemSlotElem.children[1].remove();
   itemSlotElem.children[0].remove();
}

// <div
//    oncontextmenu={oncontextmenu}
//    onmouseover={onMouseOver}
//    onmouseout={onMouseOut}
//    onmousemove={onMouseMove}
//    onmousedown={onmousedown}
//    class="item-slot{typeof rest.class !== "undefined" ? " " + rest.class : ""}"
//    class:selected={isSelected}
//    class:empty={typeof item === "undefined"}
// >
//    {#if typeof img !== "undefined"}
//       <img src={img} draggable={false} alt="" />
//    {/if}
//    {#if item !== null}
//       <div class="item-count">{item.count !== 1 ? item.count : ""}</div>
//    {/if}
//    {#if (typeof restTime !== "undefined" && restTime.durationTicks > 0)}
//       <div class="cooldown-bg" style:--cooldown="{restTime.remainingTimeTicks / restTime.durationTicks}"></div>
//    {/if}
// </div>