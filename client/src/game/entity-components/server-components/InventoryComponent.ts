import { PacketReader, InventoryName, Item, ITEM_TYPE_RECORD, Inventory, ItemType, Entity, LimbAction, ServerComponentType, copyInventoryShallow, copyInventoryDeep } from "webgl-test-shared";
import { inventoryState } from "../../../ui-state/inventory-state";
import { inventoriesAreDifferent } from "../../inventory-manipulation";
import { playerInstance } from "../../player";
import { getPlayerSelectedItemSlot, onItemDeselect, onItemSelect } from "../../player-action-handling";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { LimbInfo, InventoryUseComponentArray, inventoryUseComponentHasLimbInfo, getLimbByInventoryName } from "./InventoryUseComponent";
import { selectedEntityInventoryState } from "../../../ui-state/selected-entity-inventory-state";

export interface InventoryComponentData {
   readonly inventories: Partial<Record<InventoryName, Inventory>>;
}

export interface InventoryComponent {
   readonly inventoryRecord: Partial<Record<InventoryName, Inventory>>;
   readonly inventories: Array<Inventory>;
}

/** Checks if the player is doing a legal action for a given item. */
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

const createInventoryFromData = (inventoryData: Inventory): Inventory => {
   const inventory = new Inventory(inventoryData.width, inventoryData.height, inventoryData.name);
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const item = inventoryData.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }

      inventory.addItem(item, itemSlot);
   }

   return inventory;
}

const updateInventoryFromData = (inventory: Inventory, inventoryData: Inventory, isPlayer: boolean): boolean => {
   let hasChanged = false;
   
   if (inventory.width !== inventoryData.width || inventory.height !== inventoryData.height) {
      inventory.width = inventoryData.width;
      inventory.height = inventoryData.height;
      hasChanged = true;
   }

   // Remove any items which have been removed from the inventory
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         continue;
      }
      
      // If it doesn't exist in the server data, remove it
      const itemData = inventoryData.itemSlots[itemSlot];
      if (typeof itemData === "undefined" || itemData.id !== item.id) {
         inventory.removeItem(itemSlot);
         hasChanged = true;

         if (isPlayer && itemSlot === getPlayerSelectedItemSlot(inventory.name)) {
            updatePlayerHeldItem(inventory.name, itemSlot);
            onItemDeselect(item.type, inventory.name === InventoryName.offhand);

            validatePlayerAction(inventory.name, null);
         }
      }
   }

   // Add all new items from the server data
   for (let itemSlot = 1; itemSlot <= inventoryData.width * inventoryData.height; itemSlot++) {
      const itemData = inventoryData.itemSlots[itemSlot];
      if (typeof itemData === "undefined") {
         continue;
      }
      
      // If there is a new item in the slot, add it
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined" || item.id !== itemData.id) {
         const item = new Item(itemData.type, itemData.count, itemData.id, itemData.nickname, itemData.namer);
         inventory.addItem(item, itemSlot);
         hasChanged = true;

         if (isPlayer && itemSlot === getPlayerSelectedItemSlot(inventory.name)) {
            onItemSelect(item.type);
            updatePlayerHeldItem(inventory.name, itemSlot);

            validatePlayerAction(inventory.name, item);
         }
      } else if (item.count !== itemData.count || item.nickname !== itemData.nickname || item.namer !== itemData.namer) {
         // Otherwise the item needs to be updated with the new server data
         item.count = itemData.count;
         item.nickname = itemData.nickname;
         item.namer = itemData.namer;
         hasChanged = true;
      }
   }

   return hasChanged;
}

const readInventory = (reader: PacketReader): Inventory => {
   const name = reader.readNumber() as InventoryName;
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
   return inventoryComponent.inventoryRecord[inventoryName] || null;
}

export const InventoryComponentArray = new ServerComponentArray<InventoryComponent, InventoryComponentData, never>(ServerComponentType.inventory, true, createComponent, getMaxRenderParts, decodeData);
InventoryComponentArray.updateFromData = updateFromData;
InventoryComponentArray.updatePlayerFromData = updatePlayerFromData;
InventoryComponentArray.updateSelectedEntityState = updateSelectedEntityState;

export function createInventoryComponentData(inventories: Partial<Record<InventoryName, Inventory>>): InventoryComponentData {
   return {
      inventories: inventories
   };
}

function decodeData(reader: PacketReader): InventoryComponentData {
   const inventories: Partial<Record<InventoryName, Inventory>> = {};
   const numInventories = reader.readNumber();
   for (let i = 0; i < numInventories; i++) {
      const inventory = readInventory(reader);
      inventories[inventory.name] = inventory;
   }

   return {
      inventories: inventories
   };
}

function createComponent(entityComponentData: EntityComponentData): InventoryComponent {
   const inventoryComponentData = entityComponentData.serverComponentData.get(ServerComponentType.inventory)!;
   
   return {
      inventoryRecord: inventoryComponentData.inventories,
      inventories: Object.values(inventoryComponentData.inventories)
   };
}

function getMaxRenderParts(): number {
   return 0;
}

function updateInventories(inventoryComponent: InventoryComponent, data: InventoryComponentData, isPlayer: boolean): void {
   // @Speed: Garbage collection
   // Add new inventories
   for (const inventoryNameKey of Object.keys(data.inventories)) {
      const inventoryName = Number(inventoryNameKey) as InventoryName;
      if (typeof inventoryComponent.inventoryRecord[inventoryName] !== "undefined") {
         continue;
      }

      const inventoryData = data.inventories[inventoryName];
      if (typeof inventoryData === "undefined") {
         continue;
      }

      inventoryComponent.inventoryRecord[inventoryName] = createInventoryFromData(inventoryData);
   }
   
   // @Speed: Garbage collection
   // Update existing inventories
   for (const inventoryNameKey of Object.keys(inventoryComponent.inventoryRecord)) {
      const inventoryName = Number(inventoryNameKey) as InventoryName;
      const inventoryData = data.inventories[inventoryName];
      // @Hack: this shouldn't be necessary, but for some reason is needed sometimes when the player respawns
      if (typeof inventoryData !== "undefined") {
         const inventory = inventoryComponent.inventoryRecord[inventoryName]!;
         // @Cleanup: unused?
         const hasChanged = updateInventoryFromData(inventory, inventoryData, isPlayer);
      }
   }
}

function updateFromData(data: InventoryComponentData, entity: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   updateInventories(inventoryComponent, data, false);
}

function updatePlayerFromData(data: InventoryComponentData): void {
   const inventoryComponent = InventoryComponentArray.getComponent(playerInstance!);
   updateInventories(inventoryComponent, data, true);

   const entityHotbar = getInventory(inventoryComponent, InventoryName.hotbar);
   const entityOffhand = getInventory(inventoryComponent, InventoryName.offhand);
   const entityHeldItemSlot = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const entityCraftingOutputSlot = getInventory(inventoryComponent, InventoryName.craftingOutputSlot);
   const entityBackpack = getInventory(inventoryComponent, InventoryName.backpack);
   const entityBackpackSlot = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const entityArmourSlot = getInventory(inventoryComponent, InventoryName.armourSlot);
   const entityGloveSlot = getInventory(inventoryComponent, InventoryName.gloveSlot);
      
   if (entityHotbar !== null && inventoriesAreDifferent(inventoryState.hotbar, entityHotbar)) {
      inventoryState.setHotbar(copyInventoryDeep(entityHotbar));
   }
   if (entityOffhand !== null && inventoriesAreDifferent(inventoryState.offhand, entityOffhand)) {
      inventoryState.setOffhand(copyInventoryDeep(entityOffhand));
   }
   if (entityHeldItemSlot !== null && inventoriesAreDifferent(inventoryState.heldItemSlot, entityHeldItemSlot)) {
      inventoryState.setHeldItemSlot(copyInventoryDeep(entityHeldItemSlot));
   }
   if (entityCraftingOutputSlot !== null && inventoriesAreDifferent(inventoryState.craftingOutputSlot, entityCraftingOutputSlot)) {
      inventoryState.setCraftingOutputSlot(copyInventoryDeep(entityCraftingOutputSlot));
   }
   if (entityBackpack !== null && inventoriesAreDifferent(inventoryState.backpack, entityBackpack)) {
      inventoryState.setBackpack(copyInventoryDeep(entityBackpack));
   }
   if (entityBackpackSlot !== null && inventoriesAreDifferent(inventoryState.backpackSlot, entityBackpackSlot)) {
      inventoryState.setBackpackSlot(copyInventoryDeep(entityBackpackSlot));
   }
   if (entityArmourSlot !== null && inventoriesAreDifferent(inventoryState.armourSlot, entityArmourSlot)) {
      inventoryState.setArmourSlot(copyInventoryDeep(entityArmourSlot));
   }
   if (entityGloveSlot !== null && inventoriesAreDifferent(inventoryState.gloveSlot, entityGloveSlot)) {
      inventoryState.setGloveSlot(copyInventoryDeep(entityGloveSlot));
   }
}

function updateSelectedEntityState(entity: Entity): void {
   // @Speed: this is happening every tick for some reason, causing refreshes every tick. baad!!
   
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   // @Garbage: extra bad cuz it has to be a semi-deep copy of the inventories to actually register!!
   selectedEntityInventoryState.setInventories(inventoryComponent.inventories.map(copyInventoryDeep));
}