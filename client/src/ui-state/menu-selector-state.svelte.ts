import { InventoryName } from "webgl-test-shared";
import { InventoryComponentArray, getInventory } from "../game/entity-components/server-components/InventoryComponent";
import { TransformComponentArray } from "../game/entity-components/server-components/TransformComponent";
import { addMenuCloseFunction } from "../game/menus";
import { sendItemDropPacket } from "../game/networking/packet-sending";
import { playerInstance } from "../game/player";
import { entityInteractionState } from "./entity-interaction-state.svelte";

export enum Menu {
   none,
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
   healthInspector
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
            entityInteractionState.setSelectedEntity(null);
            menuSelectorState.setMenu(Menu.none);
            
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
      }
   }
};