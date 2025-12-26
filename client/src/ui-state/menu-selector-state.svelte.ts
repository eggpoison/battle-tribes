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

interface MenuInfo {
   readonly menu: Menu;
   readonly closeFunction: () => void;
}

const menuStack = $state(new Array<MenuInfo>());

export const menuSelectorState = {
   get menuStack() {
      return menuStack;
   },
   
   openMenu(menu: Menu): void {
      menuStack.push({
         menu: menu,
         closeFunction: () => {
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
         }
      });
   },
   closeCurrentMenu(): boolean {
      if (menuStack.length === 0) {
         return false;
      }

      menuStack[0].closeFunction();
      menuStack.pop();
      return true;
   },
   /** Closes a specific menu, and any menus opened above it. */
   closeMenu(menu: Menu): void {
      let idx: number | undefined;
      for (let i = 0; i < menuStack.length; i++) {
         const menuInfo = menuStack[i];
         if (menuInfo.menu === menu) {
            idx = i;
            break;
         }
      }
      if (typeof idx === "undefined") {
         // Menu isn't open, so do nothing
         return;
      }
  
      for (let i = menuStack.length - 1; i >= idx; i--) {
         const menuInfo = menuStack[i];
         menuInfo.closeFunction();
      }
      menuStack.splice(idx, menuStack.length - idx);
   },
   menuIsOpen(menu: Menu): boolean {
      return menuStack.some(menuInfo => menuInfo.menu === menu);
   },
   hasOpenMenu(): boolean {
      return menuStack.length > 0
   },
   /** If the menu is open, closes it. If no menu is open, opens the menu. If a different menu is open, do nothing. */
   toggleMenu(menu: Menu): void {
      if (menuSelectorState.hasOpenMenu() && !this.menuIsOpen(menu)) {
         return;
      }
   
      if (menuSelectorState.menuIsOpen(menu)) {
         menuSelectorState.closeMenu(menu);
      } else {
         // Otherwise, select the clicked tab.
         menuSelectorState.openMenu(menu);
      }
   }
};