import { addMenuCloseFunction } from "../game/menus";
import { entityInteractionState } from "./entity-interaction-state.svelte";

export enum Menu {
   none,
   buildMenu,
   animalStaffOptions,
   craftingMenu,
   tamingMenu,
   signInscribeMenu,
   barrelInventory,
   tribesmanInventory,
   campfireInventory,
   furnaceInventory,
   tombstoneEpitaph,
   ammoBoxInventory
}

let menu = $state(Menu.none);

export const menuSelectorState = {
   get menu() {
      return menu;
   },
   setMenu(newMenu: Menu): void {
      menu = newMenu;
      if (newMenu !== Menu.none) {
         addMenuCloseFunction(() => {
            entityInteractionState.deselectSelectedEntity();
            menuSelectorState.setMenu(Menu.none);
         });
      }
   }
};