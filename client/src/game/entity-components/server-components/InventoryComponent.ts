import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { Inventory, Item, InventoryName, ItemType } from "../../../../../shared/src/items/items";
import { PacketReader } from "../../../../../shared/src/packets";
import { assert } from "../../../../../shared/src/utils";
import { playerInstance } from "../../player";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { InventoryUseComponentArray, getLimbByInventoryName } from "./InventoryUseComponent";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getMenuInventoryElemInfo, getMenuItemSlotElem } from "../../../ui/menus";
import { addItemToItemSlot, removeItemFromItemSlot, updateItemSlot } from "../../../ui/game/inventories/ItemSlot";

export interface InventoryComponentData {
   readonly inventories: readonly Inventory[];
}

export interface InventoryComponent {
   readonly inventories: readonly Inventory[];
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.inventory, typeof InventoryComponentArray> {}
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
      const itemType: ItemType = reader.readNumber();
      const count = reader.readNumber();
      const nickname = reader.readString();
      const namer = reader.readString();

      const item = new Item(itemType, count, id, nickname, namer);
      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

const updateInventoryFromData = (inventory: Inventory, inventoryData: Inventory, entity: Entity, isSelected: boolean): void => {
   if (inventory.width !== inventoryData.width || inventory.height !== inventoryData.height) {
      inventory.width = inventoryData.width;
      inventory.height = inventoryData.height;
   }

   const numSlots = inventory.width * inventory.height;

   // Remove any items which have been removed from the inventory
   for (let itemSlot = 1; itemSlot <= numSlots; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (item === undefined) {
         continue;
      }
      
      // If it doesn't exist in the server data, remove it
      const itemData = inventoryData.itemSlots[itemSlot];
      if (itemData === undefined || itemData.id !== item.id) {
         inventory.removeItem(itemSlot);

         if (isSelected) {
            const inventoryElemInfo = getMenuInventoryElemInfo(entity, inventory.name);
            if (inventoryElemInfo !== null) {
               const itemSlotElem = getMenuItemSlotElem(inventoryElemInfo, itemSlot);
               removeItemFromItemSlot(itemSlotElem);

               if (inventoryElemInfo.menu.onItemRemove !== undefined) {
                  inventoryElemInfo.menu.onItemRemove(itemSlot, item, inventory.name);
               }
            }
         }
      }
   }

   // Add all new items from the server data
   for (let itemSlot = 1; itemSlot <= numSlots; itemSlot++) {
      const itemData = inventoryData.itemSlots[itemSlot];
      if (itemData === undefined) {
         continue;
      }
      
      // If there is a new item in the slot, add it
      const item = inventory.itemSlots[itemSlot];
      if (item === undefined || item.id !== itemData.id) {
         const item = new Item(itemData.type, itemData.count, itemData.id, itemData.nickname, itemData.namer);
         inventory.addItem(item, itemSlot);

         if (isSelected) {
            const inventoryElemInfo = getMenuInventoryElemInfo(entity, inventory.name);
            if (inventoryElemInfo !== null) {
               const itemSlotElem = getMenuItemSlotElem(inventoryElemInfo, itemSlot);
               addItemToItemSlot(itemSlotElem, item.type, item.count);

               if (inventoryElemInfo.menu.onItemAdd !== undefined) {
                  inventoryElemInfo.menu.onItemAdd(itemSlot, item, inventory.name);
               }
            }
         }
      } else if (item.count !== itemData.count || item.nickname !== itemData.nickname || item.namer !== itemData.namer) {
         // Otherwise the item needs to be updated with the new server data
         item.count = itemData.count;
         item.nickname = itemData.nickname;
         item.namer = itemData.namer;

         if (isSelected) {
            const inventoryElemInfo = getMenuInventoryElemInfo(entity, inventory.name);
            if (inventoryElemInfo !== null) {
               const itemSlotElem = getMenuItemSlotElem(inventoryElemInfo, itemSlot);
               updateItemSlot(itemSlotElem, item);
            }
         }
      }
   }
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

export const InventoryComponentArray = registerServerComponentArray(
   ServerComponentType.inventory,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
InventoryComponentArray.updateFromData = updateFromData;
InventoryComponentArray.updatePlayerFromData = updatePlayerFromData;

function decodeData(reader: PacketReader): InventoryComponentData {
   const inventories: Inventory[] = [];
   const numInventories = reader.readNumber();
   for (let i = 0; i < numInventories; i++) {
      const inventory = readInventory(reader);
      inventories.push(inventory);
   }

   return {
      inventories: inventories
   };
}

function createComponent(entityComponentData: EntityComponentData): InventoryComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const inventoryComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.inventory);
   return {
      inventories: inventoryComponentData.inventories
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateInventories(inventoryComponent: InventoryComponent, data: InventoryComponentData, entity: Entity, isSelected: boolean): void {
   assert(inventoryComponent.inventories.length === data.inventories.length);

   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      updateInventoryFromData(inventoryComponent.inventories[i], data.inventories[i], entity, isSelected);
   }
}

function updateFromData(data: InventoryComponentData, entity: Entity, isSelected: boolean): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   updateInventories(inventoryComponent, data, entity, isSelected);
}

function updatePlayerFromData(data: InventoryComponentData): void {
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   updateInventories(inventoryComponent, data, playerInstance!, true);
}

export function createInventoryComponentData(inventories: readonly Inventory[]): InventoryComponentData {
   return {
      inventories: inventories
   };
}