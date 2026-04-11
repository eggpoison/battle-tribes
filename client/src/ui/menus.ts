import { assert, Entity, InventoryName } from "../../../shared/src";
import { createItemsTab, destroyItemsTab } from "./game/dev/tabs/ItemsTab";
import { closeCraftingMenu, openCraftingMenu } from "./game/menus/CraftingMenu";

export enum MenuType {
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
   itemsDevTab,
   summonDevTab,
   titlesDevTab,
   tribesDevTab,
   tribePlanVisualiser,
   techTree
}

interface MenuInfo {
   readonly openFunction: () => void;
   readonly closeFunction: () => void;
   readonly isInventory: boolean;
}

export interface MenuInventoryInfo {
   readonly entity: Entity;
   readonly inventoryName: InventoryName;
}

export interface Menu {
   readonly type: MenuType;
   readonly inventoryInfo?: MenuInventoryInfo;
}

const menuStack: Array<Menu> = [];

const MENU_INFO_RECORD: Record<MenuType, MenuInfo> = {
   [MenuType.buildMenu]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.animalStaffOptions]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.craftingMenu]: {
      openFunction: openCraftingMenu,
      closeFunction: closeCraftingMenu,
      isInventory: false
   },
   [MenuType.tamingMenu]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.tamingRenamePrompt]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.signInscribeMenu]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.barrelInventory]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: true
   },
   [MenuType.tribesmanInventory]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.campfireInventory]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.furnaceInventory]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.ammoBoxInventory]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.tombstoneEpitaph]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.itemsDevTab]: {
      openFunction: createItemsTab,
      closeFunction: destroyItemsTab,
      isInventory: false
   },
   [MenuType.summonDevTab]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.titlesDevTab]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.tribesDevTab]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.tribePlanVisualiser]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
   [MenuType.techTree]: {
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isInventory: false
   },
};

const MENU_IS_EMBODIED_RECORD: Record<MenuType, boolean> = {
   [MenuType.buildMenu]: true,
   [MenuType.animalStaffOptions]: true,
   [MenuType.craftingMenu]: false,
   [MenuType.tamingMenu]: false,
   [MenuType.tamingRenamePrompt]: false,
   [MenuType.signInscribeMenu]: false,
   [MenuType.barrelInventory]: false,
   [MenuType.tribesmanInventory]: false,
   [MenuType.campfireInventory]: false,
   [MenuType.furnaceInventory]: false,
   [MenuType.ammoBoxInventory]: false,
   [MenuType.tombstoneEpitaph]: false,
   [MenuType.itemsDevTab]: false,
   [MenuType.summonDevTab]: false,
   [MenuType.titlesDevTab]: false,
   [MenuType.tribesDevTab]: false,
   [MenuType.tribePlanVisualiser]: false,
   [MenuType.techTree]: false,
}

export function menuIsInventory(menuType: MenuType): boolean {
   return MENU_INFO_RECORD[menuType].isInventory;
}

export function getOpenMenu(): Menu | null {
   if (menuStack.length === 0) {
      return null;
   }

   return menuStack[menuStack.length - 1];
}

export function openMenu(menuType: MenuType, inventoryInfo?: MenuInventoryInfo): void {
   // Make sure the menu isn't already open
   assert(!menuStack.some(currentMenu => currentMenu.type === menuType));
   
   const menuInfo = MENU_INFO_RECORD[menuType];
   
   menuInfo.openFunction();
   
   menuStack.push({
      type: menuType,
      inventoryInfo
   });
}

/*

// @SQUEAM


if (entitySelectionState.selectedEntity !== null && menuIsInventory(menu)) {
   sendCloseEntityInventoryPacket(entitySelectionState.selectedEntity);
}

entitySelectionState.setSelectedEntity(null);

// @INVESTIGATE: this might actually be bad for gameplay, cuz what if you randomly drop something or someone attacks you while you're doing something and you're forced to find a place to put your held item...
// When an inventory is closed, if an item was being dragged, drop the item
if (playerInstance !== null) {
   // @CLEANUP: Isn't this copied?????? hideInventory in player-action-handling.ts
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance);
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot)!;
   const heldItem = heldItemInventory.itemSlots[1];
   if (heldItem !== undefined) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      const hitbox = transformComponent.hitboxes[0];
      sendItemDropPacket(InventoryName.heldItemSlot, 1, heldItem.count, hitbox.box.angle);
   }
}

*/

export function closeCurrentMenu(): boolean {
   const menu = menuStack.pop();
   if (menu) {
      const menuInfo = MENU_INFO_RECORD[menu.type];
      menuInfo.closeFunction();
      return true;
   }
   return false;
}

/** Closes a specific menu, and any menus opened after it. */
export function closeMenu(menuType: MenuType): void {
   let idx: number | undefined;
   for (let i = 0; i < menuStack.length; i++) {
      const menu = menuStack[i];
      if (menu.type === menuType) {
         idx = i;
         break;
      }
   }
   if (idx === undefined) {
      // Menu isn't open, so do nothing
      return;
   }

   for (let i = menuStack.length - 1; i >= idx; i--) {
      const menu = menuStack[i];
      const menuInfo = MENU_INFO_RECORD[menu.type];
      menuInfo.closeFunction();
   }
   menuStack.splice(idx, menuStack.length - idx);
}

export function menuIsOpen(menuType: MenuType): boolean {
   return menuStack.some(menu => menu.type === menuType);
}

export function hasOpenMenu(): boolean {
   return menuStack.length > 0;
}

export function hasOpenEmbodiedMenu(): boolean {
   for (const menu of menuStack) {
      if (MENU_IS_EMBODIED_RECORD[menu.type]) {
         return true;
      }
   }
   return false;
}

export function hasOpenNonEmbodiedMenu(): boolean {
   for (const menu of menuStack) {
      if (!MENU_IS_EMBODIED_RECORD[menu.type]) {
         return true;
      }
   }
   return false;
}

/** If the menu is open, closes it. If no menu is open, opens the menu. If a different menu is open, do nothing. */
export function toggleMenu(menu: MenuType): void {
   if (hasOpenMenu() && !menuIsOpen(menu)) {
      return;
   }

   if (menuIsOpen(menu)) {
      closeMenu(menu);
   } else {
      // Otherwise, select the clicked tab.
      openMenu(menu);
   }
}