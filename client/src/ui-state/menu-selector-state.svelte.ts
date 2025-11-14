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

export enum MenuDisplayType {
   /** The menu remains static on the screen. */
   static,
   /** The menu is tracked to the selected entity, and will close automatically if the cursor moves too far off it. */
   entityTracked
}

const MENU_DISPLAY_TYPES: Record<Menu, MenuDisplayType> = {
   [Menu.buildMenu]: MenuDisplayType.entityTracked,
   [Menu.animalStaffOptions]: MenuDisplayType.entityTracked,
   [Menu.craftingMenu]: MenuDisplayType.static,
   [Menu.tamingMenu]: MenuDisplayType.static,
   [Menu.tamingRenamePrompt]: MenuDisplayType.static,
   [Menu.signInscribeMenu]: MenuDisplayType.static,
   [Menu.barrelInventory]: MenuDisplayType.static,
   [Menu.tribesmanInventory]: MenuDisplayType.static,
   [Menu.campfireInventory]: MenuDisplayType.static,
   [Menu.furnaceInventory]: MenuDisplayType.static,
   [Menu.ammoBoxInventory]: MenuDisplayType.static,
   [Menu.tombstoneEpitaph]: MenuDisplayType.static,
   [Menu.healthInspector]: MenuDisplayType.static,
   [Menu.itemsDevTab]: MenuDisplayType.static,
   [Menu.summonDevTab]: MenuDisplayType.static,
   [Menu.titlesDevTab]: MenuDisplayType.static,
   [Menu.tribesDevTab]: MenuDisplayType.static,
   [Menu.tribePlanVisualiser]: MenuDisplayType.static,
   [Menu.techTree]: MenuDisplayType.static
}

interface MenuInfo {
   readonly menu: Menu;
   readonly closeFunction: () => void;
   readonly displayType: MenuDisplayType;
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
         },
         // @Memory: not required. is the same for each menu.
         displayType: MENU_DISPLAY_TYPES[menu]
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
   hasOpenStaticMenu(): boolean {
      for (const menuInfo of menuStack) {
         if (menuInfo.displayType === MenuDisplayType.static) {
            return true;
         }
      }
      return false;
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