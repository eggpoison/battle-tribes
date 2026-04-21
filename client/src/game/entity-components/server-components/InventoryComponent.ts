import { PacketReader, InventoryName, Item, ITEM_TYPE_RECORD, Inventory, ItemType, Entity, LimbAction, ServerComponentType, assert } from "webgl-test-shared";
import { playerInstance } from "../../player";
import { getPlayerSelectedItemSlot, onItemDeselect, onItemSelect } from "../../player-action-handling";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { LimbInfo, InventoryUseComponentArray, inventoryUseComponentHasLimbInfo, getLimbByInventoryName } from "./InventoryUseComponent";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../entity-component-types";
import { updateCraftableRecipes } from "../../../ui/game/menus/CraftingMenu";
import { Hotbar_addItem, Hotbar_removeItem, Hotbar_updateItem } from "../../../ui/game/inventories/Hotbar";
import { registerServerComponentArray } from "../component-register";

export interface InventoryComponentData {
   readonly inventories: ReadonlyArray<Inventory>;
}

export interface InventoryComponent {
   readonly inventories: ReadonlyArray<Inventory>;
}

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

const readInventory = (reader: PacketReader): Inventory => {
   const name: InventoryName = reader.readNumber();
   const width = reader.readNumber();
   const height = reader.readNumber();
   const inventory = new Inventory(width, height, name);

   const numItems = reader.readNumber();
   for (let j = 0; j < numItems; j++) {
      const itemSlot = reader.readNumber();
      const id = reader.readNumber();
      const itemType = reader.readNumber() as ItemType;
      const count = reader.readNumber();
      const nickname = reader.readString();
      const namer = reader.readString();

      const item = new Item(itemType, count, id, nickname, namer);
      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

const updateInventoryFromData = (inventory: Inventory, inventoryData: Inventory, isPlayer: boolean): boolean => {
   let itemsHaveChanged = false;
   
   if (inventory.width !== inventoryData.width || inventory.height !== inventoryData.height) {
      inventory.width = inventoryData.width;
      inventory.height = inventoryData.height;
   }

   // Remove any items which have been removed from the inventory
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (item === undefined) {
         continue;
      }
      
      // If it doesn't exist in the server data, remove it
      const itemData = inventoryData.itemSlots[itemSlot];
      if (itemData === undefined || itemData.id !== item.id) {
         inventory.removeItem(itemSlot);

         if (isPlayer) {
            Hotbar_removeItem(inventory, itemSlot);
            itemsHaveChanged = true;

            if (itemSlot === getPlayerSelectedItemSlot(inventory.name)) {
               updatePlayerHeldItem(inventory.name, itemSlot);
               onItemDeselect(item.type, inventory.name === InventoryName.offhand);
               
               validatePlayerAction(inventory.name, null);
            } else if (inventory.name === InventoryName.craftingOutputSlot) {
               // @HACK @CLEANUP
               
            }
         }
      }
   }

   // Add all new items from the server data
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const itemData = inventoryData.itemSlots[itemSlot];
      if (itemData === undefined) {
         continue;
      }
      
      // If there is a new item in the slot, add it
      const item = inventory.itemSlots[itemSlot];
      if (item === undefined || item.id !== itemData.id) {
         const item = new Item(itemData.type, itemData.count, itemData.id, itemData.nickname, itemData.namer);
         inventory.addItem(item, itemSlot);

         if (isPlayer) {
            Hotbar_addItem(inventory, itemSlot, item);
            itemsHaveChanged = true;

            if (itemSlot === getPlayerSelectedItemSlot(inventory.name)) {
               onItemSelect(item.type);
               updatePlayerHeldItem(inventory.name, itemSlot);
               
               validatePlayerAction(inventory.name, item);
            }
         }
      } else if (item.count !== itemData.count || item.nickname !== itemData.nickname || item.namer !== itemData.namer) {
         // Otherwise the item needs to be updated with the new server data
         item.count = itemData.count;
         item.nickname = itemData.nickname;
         item.namer = itemData.namer;

         if (isPlayer) {
            Hotbar_updateItem(inventory, itemSlot, item);
            itemsHaveChanged = true;
         }
      }
   }

   return itemsHaveChanged;
}

export function updatePlayerHeldItem(inventoryName: InventoryName, heldItemSlot: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerInstance!);
   
   const inventory = getInventory(inventoryComponent, inventoryName)!;
   const limb = getLimbByInventoryName(inventoryUseComponent, inventoryName);
   
   const heldItem = inventory.getItem(heldItemSlot);
   if (heldItem === null) {
      limb.heldItemType = null;
   } else {
      limb.heldItemType = heldItem.type;
   }
}

export function getInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName): Inventory | null {
   for (const inventory of inventoryComponent.inventories) {
      if (inventory.name === inventoryName) {
         return inventory;
      }
   }
   return null;
}

class _InventoryComponentArray extends ServerComponentArray<InventoryComponent, InventoryComponentData> {
   public decodeData(reader: PacketReader): InventoryComponentData {
      const inventories: Array<Inventory> = [];
      const numInventories = reader.readNumber();
      for (let i = 0; i < numInventories; i++) {
         const inventory = readInventory(reader);
         inventories.push(inventory);
      }

      return {
         inventories: inventories
      };
   }

   public createComponent(entityComponentData: EntityComponentData): InventoryComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const inventoryComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.inventory);
      return {
         inventories: inventoryComponentData.inventories
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public updateFromData(data: InventoryComponentData, entity: Entity): void {
      const inventoryComponent = InventoryComponentArray.getComponent(entity);
      updateInventories(inventoryComponent, data, false);
   }

   public updatePlayerFromData(data: InventoryComponentData): void {
      const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
      const itemsHaveChanged = updateInventories(inventoryComponent, data, true);
      if (itemsHaveChanged) {
         updateCraftableRecipes(inventoryComponent.inventories);
      }
   }

   public updateSelectedEntityState(entity: Entity): void {
      // @Speed: this is happening every tick for some reason, causing refreshes every tick. baad!!
      
      // @INCOMPLETE
      // const inventoryComponent = InventoryComponentArray.getComponent(entity);
      // // @Garbage: extra bad cuz it has to be a semi-deep copy of the inventories to actually register!!
      // selectedEntityInventoryState.setInventories(inventoryComponent.inventories.map(copyInventoryDeep));
   }
}

export const InventoryComponentArray = registerServerComponentArray(ServerComponentType.inventory, _InventoryComponentArray, true);

export function createInventoryComponentData(inventories: ReadonlyArray<Inventory>): InventoryComponentData {
   return {
      inventories: inventories
   };
}

function updateInventories(inventoryComponent: InventoryComponent, data: InventoryComponentData, isPlayer: boolean): boolean {
   assert(inventoryComponent.inventories.length === data.inventories.length);

   let itemsHaveChanged = false;
   
   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      const changed = updateInventoryFromData(inventoryComponent.inventories[i], data.inventories[i], isPlayer);
      if (changed) {
         itemsHaveChanged = true;
      }
   }

   return itemsHaveChanged;
}