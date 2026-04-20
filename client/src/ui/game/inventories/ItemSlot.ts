import { assert, Entity, Inventory, InventoryName, Item, ItemType } from "../../../../../shared/src";
import { getItemTypeImage } from "../../../game/client-item-info";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { shiftIsPressed } from "../../../game/event-handling";
import { sendItemTransferPacket, sendItemPickupPacket, sendItemReleasePacket } from "../../../game/networking/packet-sending/packet-sending";
import { playerInstance } from "../../../game/player";
import { getOpenMenu, hasOpenMenu } from "../../menus";

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
   const clickedItem = inventory.itemSlots[itemSlot];
   if (clickedItem !== undefined) {
      // Attempt to pick up the item if there isn't a held item
      const playerInventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (heldItem === undefined) {
         // If shift is held, transfer the item between the player's inventory and the opened inventory
         if (shiftIsPressed) {
            const openMenu = getOpenMenu();
            if (openMenu !== null) {
               const inventoryInfo = openMenu.inventoryInfo;
               if (inventoryInfo !== undefined) {
                  let otherOpenMenuInventory: Inventory;
                  let otherOpenMenuEntity: Entity;
                  if (inventoryInfo.entity === entity) {
                     otherOpenMenuInventory = getInventory(playerInventoryComponent, InventoryName.hotbar)!;
                     otherOpenMenuEntity = playerInstance!;
                  } else {
                     const entityInventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
                     otherOpenMenuInventory = getInventory(entityInventoryComponent, inventoryInfo.inventoryName)!;
                     otherOpenMenuEntity = inventoryInfo.entity;
                  }

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
      if (heldItem !== undefined) {
         sendItemReleasePacket(entity, inventory.name, itemSlot, heldItem.count);
      }
   }
}

const rightClickItemSlot = (entity: Entity, inventory: Inventory, itemSlot: number): void => {
   const clickedItem = inventory.itemSlots[itemSlot];
   if (clickedItem !== undefined) {
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (heldItem === undefined) {
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
   return hasOpenMenu();
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
   itemSlotElem.className = "item-slot";
   return itemSlotElem;
}

export function makeItemSlotInteractable(itemSlotElem: HTMLElement, entity: Entity, inventory: Inventory, itemSlot: number): void {
   itemSlotElem.addEventListener("mousedown", e => { onMouseDown(e, entity, inventory, itemSlot); });
}

export function addItemToItemSlot(itemSlotElem: HTMLElement, itemType: ItemType, itemAmount: number): void {
   const img = getItemTypeImage(itemType);

   const imgElem = document.createElement("img");
   imgElem.src = img;
   itemSlotElem.appendChild(imgElem);

   const itemCountElem = document.createElement("div");
   itemCountElem.className = "item-count";
   // I'm thinking it will create less garbage to always create item count text for items, even if they are only stacked to one.
   itemCountElem.textContent = itemAmount.toString();
   if (itemAmount === 1) {
      itemCountElem.hidden = true;
   }
   itemSlotElem.appendChild(itemCountElem);
}

export function updateItemSlot(itemSlotElem: HTMLElement, item: Item): void {
   const itemCountElem = itemSlotElem.children[1] as HTMLElement;
   if (item.count !== -1) {
      itemCountElem.hidden = false;
      (itemCountElem.firstChild as Text).data = item.count.toString();
   } else {
      itemCountElem.hidden = true;
   }
}

export function removeItemFromItemSlot(itemSlotElem: HTMLElement): void {
   assert(itemSlotElem.children.length === 2);
   itemSlotElem.children[1].remove();
   itemSlotElem.children[0].remove();
}

export function addItemSlotSelection(itemSlotElem: HTMLElement): void {
   itemSlotElem.classList.add("selected");
}

export function removeItemSlotSelection(itemSlotElem: HTMLElement): void {
   itemSlotElem.classList.remove("selected");
}

export function addItemSlotPlaceholderImage(itemSlotElem: HTMLElement, imgSrc: string): void {
   const placeholderImg = document.createElement("img");
   placeholderImg.src = imgSrc;
   itemSlotElem.appendChild(placeholderImg);
}

// <div
//    oncontextmenu={oncontextmenu}
//    onmouseover={onMouseOver}
//    onmouseout={onMouseOut}
//    onmousemove={onMouseMove}
//    onmousedown={onmousedown}


// @Incomplete
//    class:empty={item === undefined}


// @Incomplete
//    {#if (restTime !== undefined && restTime.durationTicks > 0)}
//       <div class="cooldown-bg" style:--cooldown="{restTime.remainingTimeTicks / restTime.durationTicks}"></div>
//    {/if}
// </div>