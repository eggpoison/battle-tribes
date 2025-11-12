import { InventoryName } from "webgl-test-shared";
import { InventoryComponentArray, getInventory } from "../game/entity-components/server-components/InventoryComponent";
import { TransformComponentArray } from "../game/entity-components/server-components/TransformComponent";
import { sendItemDropPacket } from "../game/networking/packet-sending";
import { playerInstance } from "../game/player";
import { entitySelectionState } from "./entity-selection-state.svelte";

export enum Menu {
   buildMenu,
   animalStaffOptions,
   craftingMenu,
   tamingMenu,
   tamingRenamePrompt,
   signInscribeMenu,
   barrelInventory,
   tribesmanInventory,
   campfireInventory,
   furnaceInventory,
   ammoBoxInventory,
   tombstoneEpitaph,
   healthInspector,
   itemsDevTab,
   summonDevTab,
   titlesDevTab,
   tribesDevTab,
   tribePlanVisualiser,
   techTree
}

let menu = $state<Menu | null>(null);
const menuCloseFunctionStack = new Array<() => void>();

const addMenuCloseFunction = (closeFunction: () => void): void => {
   menuCloseFunctionStack.push(closeFunction);
}

export const menuSelectorState = {
   get menu() {
      return menu;
   },
   openMenu(newMenu: Menu): void {
      menu = newMenu;

      addMenuCloseFunction(() => {
         entitySelectionState.setSelectedEntity(null);
         
         // @INVESTIGATE: this might actually be bad for gameplay, cuz what if you randomly drop something or someone attacks you while you're doing something and you're forced to find a place to put your held item...
         // When an inventory is closed, if an item was being dragged, drop the item
         if (playerInstance !== null) {
            const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
            const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
            const heldItem = heldItemInventory.itemSlots[1];
            if (typeof heldItem !== "undefined") {
               const transformComponent = TransformComponentArray.getComponent(playerInstance);
               const hitbox = transformComponent.hitboxes[0];
               sendItemDropPacket(InventoryName.heldItemSlot, 1, heldItem.count, hitbox.box.angle);
            }
         }
      });
   },
   closeMenu(): boolean {
      menu = null;
      
      if (menuCloseFunctionStack.length > 0) {
         const closeFunction = menuCloseFunctionStack[menuCloseFunctionStack.length - 1];
         closeFunction();

         menuCloseFunctionStack.splice(menuCloseFunctionStack.length - 1, 1);
         return true;
      }
      
      return false;
   }
};