import { Entity } from "../../../../../shared/src/entities";
import { Inventory, InventoryName, ItemType, Item } from "../../../../../shared/src/items/items";
import { assert } from "../../../../../shared/src/utils";
import { getItemTypeImage } from "../../../game/client-item-info";
import { getInventory, InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
import { shiftIsPressed } from "../../../game/event-handling";
import { sendItemTransferPacket, sendItemPickupPacket, sendItemReleasePacket } from "../../../game/networking/packet-sending/packet-sending";
import { playerInstance } from "../../../game/player";
import { getFirstOpenInventory, hasOpenMenu } from "../../menus";
import { getClickedItemSlotIdx } from "./Inventory";
import { clearTooltipItem, setTooltipItem } from "./ItemTooltip";

// let { item, isSelected, placeholderImg, restTime, onmousedown, onmouseover, onmouseout, onmousemove, oncontextmenu, ...rest }: Props = $props();

// const img = $derived(item !== null ? getItemTypeImage(item.type) : placeholderImg);

// let isShowingTooltip = $state(false);

const onMouseOver = (item: Item): void => {
   // onmouseover?.(e);

   setTooltipItem(item);
   // isShowingTooltip = true;
}

// const onMouseMove = (e: MouseEvent): void => {
//    onmousemove?.(e);
// }

const onMouseOut = (): void => {
   // onmouseout?.(e);
   // isShowingTooltip = false;

   // @Bug? what if this overrides it?
   clearTooltipItem();
}

// onDestroy(() => {
//    // If the player is hovering over the item when the menu is closed, the onMouseOut function won't be triggered, so we have to also clear the item tooltip when it's destroyed
//    if (isShowingTooltip) {
//       itemTooltipState.setItem(null);
//    }
// });

const leftClickItemSlot = (entity: Entity, inventory: Inventory, itemSlot: number): void => {
   const playerInventoryComponent = InventoryComponentArray.getComponent(playerInstance!);

   const clickedItem = inventory.itemSlots[itemSlot];
   if (clickedItem !== undefined) {
      // Attempt to pick up the item if there isn't a held item
      const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (heldItem === undefined) {
         // If shift is held, transfer the item between the player's inventory and the opened inventory
         if (shiftIsPressed) {
            const openInventoryInfo = getFirstOpenInventory();
            if (openInventoryInfo !== null) {
               let otherOpenMenuInventory: Inventory;
               let otherOpenMenuEntity: Entity;
               if (openInventoryInfo.entity === entity) {
                  otherOpenMenuInventory = getInventory(playerInventoryComponent, InventoryName.hotbar)!;
                  otherOpenMenuEntity = playerInstance!;
               } else {
                  const entityInventoryComponent = InventoryComponentArray.getComponent(openInventoryInfo.entity);
                  otherOpenMenuInventory = getInventory(entityInventoryComponent, openInventoryInfo.inventoryName)!;
                  otherOpenMenuEntity = openInventoryInfo.entity;
               }

               sendItemTransferPacket(entity, inventory.name, itemSlot, otherOpenMenuEntity, otherOpenMenuInventory.name);
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
      const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot)!;
      const heldItem = heldItemInventory.itemSlots[1];
      if (heldItem !== undefined) {
         sendItemReleasePacket(entity, inventory.name, itemSlot, heldItem.count);
      }
   }
}

const rightClickItemSlot = (entity: Entity, inventory: Inventory, itemSlot: number): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
   
   const clickedItem = inventory.itemSlots[itemSlot];
   if (clickedItem !== undefined) {
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
      
      if (heldItemInventory.hasItem(1)) {
         // Attempt to place one of the held item into the clicked item slot
         sendItemReleasePacket(entity, inventory.name, itemSlot, 1);
      }
   }
}

const inventoryIsFocused = (): boolean => {
   return hasOpenMenu();
}

const onItemSlotMouseDown = (e: MouseEvent, entity: Entity, inventory: Inventory, itemSlot: number): void => {
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
   itemSlotElem.onmousedown = e => { onItemSlotMouseDown(e, entity, inventory, itemSlot); };
   itemSlotElem.onmouseover = () => {
      const item = inventory.itemSlots[itemSlot];
      if (item !== undefined) {
         onMouseOver(item);
      }
   };
   itemSlotElem.onmouseout = onMouseOut;
}

export function makeInventoryInteractable(inventoryElem: HTMLElement, entity: Entity, inventory: Inventory): void {
   inventoryElem.onmousedown = e => {
      const itemSlotIdx = getClickedItemSlotIdx(e, inventory.width, inventory.height);
      onItemSlotMouseDown(e, entity, inventory, itemSlotIdx + 1);
   };
   // Note: This is on mouse MOVE, instead of mouse over.
   inventoryElem.onmousemove = e => {
      const itemSlotIdx = getClickedItemSlotIdx(e, inventory.width, inventory.height);
      
      const item = inventory.itemSlots[itemSlotIdx + 1];
      if (item !== undefined) {
         onMouseOver(item);
      } else {
         onMouseOut();
      }
   };
   inventoryElem.onmouseout = onMouseOut;
}

const createItemCountElem = (itemSlotElem: HTMLElement, amount: number): void => {
   const itemCountElem = document.createElement("div");
   itemCountElem.className = "item-count";
   itemCountElem.textContent = amount.toString();
   itemSlotElem.appendChild(itemCountElem);
}

export function addItemToItemSlot(itemSlotElem: HTMLElement, itemType: ItemType, itemAmount: number): void {
   const img = getItemTypeImage(itemType);

   const imgElem = document.createElement("img");
   imgElem.src = img;
   itemSlotElem.appendChild(imgElem);

   if (itemAmount !== 1) {
      createItemCountElem(itemSlotElem, itemAmount);
   }
}

export function updateItemSlot(itemSlotElem: HTMLElement, item: Item): void {
   const itemCountElem = itemSlotElem.children[1] as HTMLElement | undefined;
   if (item.count !== 1) {
      if (itemCountElem === undefined) {
         createItemCountElem(itemSlotElem, item.count);
      } else {
         (itemCountElem.firstChild as Text).data = item.count.toString();
      }
   } else {
      assert(itemCountElem !== undefined);
      itemCountElem.remove();
   }
}

export function removeItemFromItemSlot(itemSlotElem: HTMLElement): void {
   assert(itemSlotElem.children.length > 0);
   itemSlotElem.replaceChildren();
}

export function addItemSlotElemSelection(itemSlotElem: HTMLElement): void {
   itemSlotElem.classList.add("selected");
}

export function removeItemSlotElemSelection(itemSlotElem: HTMLElement): void {
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