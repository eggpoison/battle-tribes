<script lang="ts">
   import { type Entity, type Inventory, InventoryName, ItemType } from "webgl-test-shared";
   import { type ItemRestTime } from "../../../game/player-action-handling";
   import ItemSlot from "./ItemSlot.svelte";
   import { Menu, menuSelectorState } from "../../../ui-state/menu-selector-state.svelte";
   import { InventoryComponentArray, getInventory } from "../../../game/entity-components/server-components/InventoryComponent";
   import { sendItemPickupPacket, sendItemReleasePacket, sendItemTransferPacket } from "../../../game/networking/packet-sending";
   import { playerInstance } from "../../../game/player";
   import { keyIsPressed } from "../../../game/keyboard-input";
   import { entitySelectionState } from "../../../ui-state/entity-selection-state.svelte";

   export interface ItemSlotCallbackInfo {
      readonly itemSlot: number;
      readonly itemType: ItemType | null;
   }

   export interface Props {
      readonly entity: Entity;
      readonly inventory: Inventory;
      readonly itemSlot: number;
      // readonly picturedItemImageSrc?: any;
      readonly isSelected?: boolean;
      readonly className?: string;
      /** Determines whether or not items can be added and removed freely. */
      readonly isManipulable?: boolean;
      readonly placeholderImg?: any;
      readonly restTime?: ItemRestTime;
      onmousedown?(e: MouseEvent): void;
      onmouseover?(e: MouseEvent): void;
      onmouseout?: () => void;
      onmousemove?: (e: MouseEvent) => void;
      onoontextmenu?: (e: MouseEvent) => void;
      /** If defined, determines whether or not a given item type is able to be put in the slot (doesn't affect taking out items) */
      validItemSpecifier?(itemType: ItemType): boolean;
   }

   let props: Props = $props();

   const item = $derived(props.inventory.getItem(props.itemSlot));

   const isManipulable = typeof props.isManipulable === "undefined" || props.isManipulable;
   
   const inventoryIsFocused = (): boolean => {
      return menuSelectorState.hasOpenMenu();
   }

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
            case Menu.healthInspector: openMenuInventory = null; openMenuEntity = null; break;
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

   const onmousedown = (e: MouseEvent): void => {
      if (isManipulable && props.inventory !== null && typeof props.entity !== "undefined" && inventoryIsFocused()) {
         if (e.button === 0) {
            leftClickItemSlot(props.entity, props.inventory, props.itemSlot);
         } else if (e.button === 2) {
            rightClickItemSlot(props.entity, props.inventory, props.itemSlot);
         }
      }
   }
</script>

<ItemSlot
   {item}
   class="{props.className}{props.isSelected ? " selected" : ""}{item === null ? " empty" : ""}"
   {onmousedown}
   oncontextmenu={e => e.preventDefault()}
   {...props}
/>