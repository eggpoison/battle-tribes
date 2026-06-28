import { Entity, LimbAction } from "../../../shared/src/entities";
import { InventoryName, Item, ITEM_TYPE_RECORD } from "../../../shared/src/items/items";
import { assert } from "../../../shared/src/utils";
import { updatePlayerHeldItem } from "../game/entity-components/server-components/InventoryComponent";
import { LimbInfo, InventoryUseComponentArray, inventoryUseComponentHasLimbInfo, getLimbByInventoryName } from "../game/entity-components/server-components/InventoryUseComponent";
import { playerInstance } from "../game/player";
import { getPlayerSelectedItemSlot, onItemDeselect, onItemSelect } from "../game/player-action-handling";
import { createItemsTab, destroyItemsTab } from "./game/dev/tabs/ItemsTab";
import { createHeldItemElem, destroyHeldItemElem } from "./game/HeldItem";
import { createBarrelInventory, destroyBarrelInventory } from "./game/inventories/BarrelInventory";
import { createHotbar, destroyHotbar } from "./game/inventories/Hotbar";
import { getInventoryItemSlotElem } from "./game/inventories/Inventory";
import { closeCraftingMenu, openCraftingMenu } from "./game/menus/CraftingMenu";

export enum MenuType {
   hotbar,
   heldItem,
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

export interface MenuInventoryElemInfo {
   readonly elem: HTMLElement;
   /** For special cases where the inventory elem is the item slot itself instead of an inventory with many item slots */
   readonly isItemSlotContainer: boolean;
}

interface InventoryElemInfo extends MenuInventoryElemInfo {
   readonly menu: Menu;
}

export type MenuInventoryElemMap = Map<InventoryName, MenuInventoryElemInfo>;

type InventoryElemMap = Map<InventoryName, InventoryElemInfo>;

interface BaseMenu {
   readonly isInventory: boolean;
   readonly closeFunction: () => void;
   readonly isBlocking: boolean;
   readonly isCloseable: boolean;
   onItemAdd?: (itemSlot: number, item: Item, inventoryName: InventoryName) => void;
   onItemRemove?: (itemSlot: number, item: Item, inventoryName: InventoryName) => void;
}

interface InventoryMenu extends BaseMenu {
   readonly isInventory: true;
   openFunction(entity: Entity): MenuInventoryElemMap;
}

export interface OrdinaryMenu extends BaseMenu {
   readonly isInventory: false;
   openFunction(): void;
}

export type Menu = InventoryMenu | OrdinaryMenu;

const menuStack: Menu[] = [];

/** Checks if the player is doing a legal action for a given item. */
// @HACK
const playerActionIsLegal = (limb: LimbInfo, item: Item | null): boolean => {
   const action = limb.action;

   // All items can be idle and attack
   if (action === LimbAction.none || action === LimbAction.windAttack || action === LimbAction.attack || action === LimbAction.returnAttackToRest) {
      return true;
   }
   
   if (item !== null) {
      switch (ITEM_TYPE_RECORD[item.type]) {
         case "spear": {
            if (action === LimbAction.chargeSpear) {
               return true;
            }
            break;
         }
      }
   }

   return false;
}

const validatePlayerAction = (inventoryName: InventoryName, item: Item | null): void => {
   // @SPEED: If everything worked flawlessly this wouldn't even be needed.
   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   if (!inventoryUseComponentHasLimbInfo(inventoryUseComponent, inventoryName)) {
      return;
   }

   const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);
   if (!playerActionIsLegal(limb, item)) {
      // Reset the action
      limb.action = LimbAction.none;
   }
}

const MENU_RECORD = {
   [MenuType.hotbar]: {
      isInventory: true,
      openFunction: createHotbar, // @Incomplete
      closeFunction: destroyHotbar, // @Incomplete
      isBlocking: false,
      isCloseable: false,
      onItemAdd: (itemSlot: number, item: Item, inventoryName: InventoryName): void => {// @INCOMPLETE
         if (itemSlot === getPlayerSelectedItemSlot(inventoryName)) {
            onItemSelect(item.type);
            updatePlayerHeldItem(inventoryName, itemSlot);
            
            validatePlayerAction(inventoryName, item);
         }
      },
      onItemRemove: (itemSlot: number, item: Item, inventoryName: InventoryName): void => {// @INCOMPLETE
         if (itemSlot === getPlayerSelectedItemSlot(inventoryName)) {
            updatePlayerHeldItem(inventoryName, itemSlot);
            onItemDeselect(item.type, inventoryName === InventoryName.offhand);
            
            validatePlayerAction(inventoryName, null);
         }
      }
   },
   [MenuType.heldItem]: {
      isInventory: true,
      openFunction: createHeldItemElem, // @Incomplete
      closeFunction: destroyHeldItemElem, // @Incomplete
      isBlocking: false,
      isCloseable: false
   },
   [MenuType.buildMenu]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: false,
      isCloseable: true
   },
   [MenuType.animalStaffOptions]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: false,
      isCloseable: true
   },
   [MenuType.craftingMenu]: {
      isInventory: true,
      openFunction: openCraftingMenu,
      closeFunction: closeCraftingMenu,
      isBlocking: true,
      isCloseable: true
      // @Incomplete
      // updateCraftableRecipes(inventoryComponent.inventories);
   },
   [MenuType.tamingMenu]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.tamingRenamePrompt]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.signInscribeMenu]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.barrelInventory]: {
      isInventory: true,
      openFunction: createBarrelInventory,
      closeFunction: destroyBarrelInventory,
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.tribesmanInventory]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.campfireInventory]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.furnaceInventory]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.ammoBoxInventory]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.tombstoneEpitaph]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.itemsDevTab]: {
      isInventory: false,
      openFunction: createItemsTab,
      closeFunction: destroyItemsTab,
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.summonDevTab]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.titlesDevTab]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.tribesDevTab]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.tribePlanVisualiser]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
   [MenuType.techTree]: {
      isInventory: false,
      openFunction: undefined as unknown as () => void, // @Incomplete
      closeFunction: undefined as unknown as () => void, // @Incomplete
      isBlocking: true,
      isCloseable: true
   },
} satisfies Record<MenuType, Menu>;

const entityInventoryElemsMap = new Map<Entity, InventoryElemMap>();

export function getMenu<T extends MenuType>(menuType: T): typeof MENU_RECORD[T] {
   return MENU_RECORD[menuType];
}

export function menuIsInventory(menuType: MenuType): boolean {
   return MENU_RECORD[menuType].isInventory;
}

export function getMenuInventoryElemInfo(entity: Entity, inventoryName: InventoryName): InventoryElemInfo | null {
   const inventoryElemMap = entityInventoryElemsMap.get(entity);
   if (inventoryElemMap === undefined) {
      return null;
   }

   const inventoryElemInfo = inventoryElemMap.get(inventoryName);
   if (inventoryElemInfo === undefined) {
      return null;
   }

   return inventoryElemInfo;
}

export function getMenuItemSlotElem(inventoryElemInfo: InventoryElemInfo, itemSlot: number): HTMLElement {
   if (inventoryElemInfo.isItemSlotContainer) {
      return inventoryElemInfo.elem;
   } else {
      return getInventoryItemSlotElem(inventoryElemInfo.elem, itemSlot);
   }
}

export function openMenu<M extends Menu>(menu: M, ...args: M extends InventoryMenu ? [Entity] : []): void {
   // Make sure the menu isn't already open
   assert(!menuStack.some(currentMenu => currentMenu === menu));
   menuStack.push(menu);
   
   if (menu.isInventory) {
      const entity = args[0]!;
      
      // Open the menu
      const elemResults = menu.openFunction(entity);
      
      const inventoryElemMap = entityInventoryElemsMap.get(entity);
      if (inventoryElemMap === undefined) {
         const map: InventoryElemMap = new Map();
         for (const pair of elemResults) {
            const inventoryName = pair[0];
            const elemInfo = pair[1];
            map.set(inventoryName, {
               elem: elemInfo.elem,
               isItemSlotContainer: elemInfo.isItemSlotContainer,
               menu: menu
            });
         }
         entityInventoryElemsMap.set(entity, map);
      } else {
         for (const pair of elemResults) {
            const inventoryName = pair[0];
            const elemInfo = pair[1];
            assert(!inventoryElemMap.has(inventoryName));

            inventoryElemMap.set(inventoryName, {
               elem: elemInfo.elem,
               isItemSlotContainer: elemInfo.isItemSlotContainer,
               menu: menu
            });
         }
      }
   } else {
      assert(args[0] === undefined);

      // Open the menu
      menu.openFunction();
   }
}

/** If the menu is open, closes it. If no menu is open, opens the menu. If a different menu is open, do nothing. */
export function toggleMenu<M extends Menu>(menu: M, ...args: M extends InventoryMenu ? [Entity] : []): void {
   if (hasOpenBlockingMenu() && !menuIsOpen(menu)) {
      return;
   }

   if (menuIsOpen(menu)) {
      closeMenu(menu);
   } else {
      // Otherwise, select the clicked tab.
      openMenu(menu, ...args);
   }
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

const handleMenuClose = (menu: Menu): void => {
   menu.closeFunction();

   // Shut everything to do with the menu
   for (const pair of entityInventoryElemsMap) {
      const entity = pair[0];
      const inventoryElemMap = pair[1];

      for (const pair of inventoryElemMap) {
         const inventoryName = pair[0];
         const elemInfo = pair[1];

         if (elemInfo.menu === menu) {
            inventoryElemMap.delete(inventoryName);
         }
      }

      if (inventoryElemMap.size === 0) {
         entityInventoryElemsMap.delete(entity);
      }
   }
}

export function closeCurrentMenu(): boolean {
   if (menuStack.length === 0) {
      return false;
   }
   
   const menu = menuStack[menuStack.length - 1];
   if (!menu.isCloseable) {
      return false;
   }
   
   handleMenuClose(menu);
   menuStack.pop();
   return true;
}

/** Closes a specific menu, and any menus opened after it. */
export function closeMenu(menu: Menu): void {
   let idx: number | undefined;
   for (let i = 0; i < menuStack.length; i++) {
      const currentMenu = menuStack[i];
      if (currentMenu === menu) {
         idx = i;
         break;
      }
   }
   if (idx === undefined) {
      // Menu isn't open, so do nothing
      return;
   }

   for (let i = menuStack.length - 1; i >= idx; i--) {
      const currentMenu = menuStack[i];
      handleMenuClose(currentMenu);
   }
   menuStack.splice(idx, menuStack.length - idx);
}

export function menuIsOpen(menu: Menu): boolean {
   return menuStack.includes(menu);
}

export function getFirstOpenInventory(): { entity: Entity, inventoryName: InventoryName } | null {
   if (menuStack.length === 0) {
      return null;
   }

   for (const pair of entityInventoryElemsMap) {
      const entity = pair[0];
      const inventoryElemMap = pair[1];
      for (const pair of inventoryElemMap) {
         const inventoryName = pair[0];

         return {
            entity: entity,
            inventoryName: inventoryName
         };
      }
   }

   return null;
}

export function hasOpenMenu(): boolean {
   for (const menu of menuStack) {
      if (menu.isCloseable) {
         return true;
      }
   }
   return false;
}

export function hasOpenBlockingMenu(): boolean {
   for (const menu of menuStack) {
      if (menu.isBlocking) {
         return true;
      }
   }
   return false;
}

export function hasOpenAutoClosingMenu(): boolean {
   for (const menu of menuStack) {
      if (menu.isCloseable && !menu.isInventory) {
         return true;
      }
   }
   return false;
}