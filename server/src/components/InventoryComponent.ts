import { ServerComponentType } from "battletribes-shared/components";
import { createItemEntityConfig } from "../entities/item-entity";
import { ComponentArray } from "./ComponentArray";
import { createItem } from "../items";
import { ItemComponentArray, itemEntityCanBePickedUp } from "./ItemComponent";
import { CraftingRecipe } from "battletribes-shared/items/crafting-recipes";
import { ItemTally2, tallyInventoryItems } from "battletribes-shared/items/ItemTally";
import { InventoryName, Inventory, ItemType, Item, itemIsStackable, ITEM_INFO_RECORD, StackableItemInfo, getItemStackSize } from "battletribes-shared/items/items";
import { Entity } from "battletribes-shared/entities";
import { getRandomPositionInEntity, TransformComponentArray } from "./TransformComponent";
import { Packet } from "battletribes-shared/packets";
import { addInventoryDataToPacket, getInventoryDataLength } from "../server/packet-sending";
import { createEntity, destroyEntity, getEntityLayer } from "../world";
import { registerDirtyEntity } from "../server/player-clients";
import { randAngle } from "../../../shared/src/utils";

export interface InventoryOptions {
   readonly acceptsPickedUpItems: boolean;
   readonly isDroppedOnDeath: boolean;
}

export class InventoryComponent {
   /** Stores a record of all inventories associated with the inventory component. */
   public readonly inventoryRecord: Partial<Record<InventoryName, Inventory>> = {};
   /** Stores all inventories associated with the inventory component in the order of when they were added. */
   public readonly inventories = new Array<Inventory>();

   public readonly accessibleInventories = new Array<Inventory>();
   /** Inventories which are dropped on death */
   public readonly droppableInventories = new Array<Inventory>();

   public readonly absentItemIDs = new Array<number>();
}

export const InventoryComponentArray = new ComponentArray<InventoryComponent>(ServerComponentType.inventory, true, getDataLength, addDataToPacket);
InventoryComponentArray.onRemove = onRemove;

const dropInventory = (entity: Entity, inventory: Inventory, dropRange: number): void => {
   const transformComponent = TransformComponentArray.getComponent(entity);
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const position = getRandomPositionInEntity(transformComponent);

      const spawnOffsetMagnitude = dropRange * Math.random();
      const spawnOffsetDirection = randAngle();
      position.x += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      position.y += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      
      const config = createItemEntityConfig(position, randAngle(), item, null);
      createEntity(config, getEntityLayer(entity), 0);
   }
}

function onRemove(entity: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);
   
   for (let i = 0; i < inventoryComponent.droppableInventories.length; i++) {
      const inventory = inventoryComponent.droppableInventories[i];

      // @Incomplete: Don't use a drop range. Instead pick a random point in any of the entities hitboxes, weighted by their area.
      dropInventory(entity, inventory, 38);
   }
}

/** Creates and stores a new inventory in the component. */
export function addInventoryToInventoryComponent(inventoryComponent: InventoryComponent, inventory: Inventory, options: InventoryOptions): Inventory {
   if (typeof inventoryComponent.inventoryRecord[inventory.name] !== "undefined") {
      throw new Error(`Tried to create an inventory when an inventory by the name of '${inventory.name}' already exists.`);
   }
   
   inventoryComponent.inventoryRecord[inventory.name] = inventory;
   inventoryComponent.inventories.push(inventory);

   if (options.acceptsPickedUpItems) {
      inventoryComponent.accessibleInventories.push(inventory);
   }
   if (options.isDroppedOnDeath) {
      inventoryComponent.droppableInventories.push(inventory);
   }

   return inventory;
}

export function resizeInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName, width: number, height: number): void {
   const inventory = inventoryComponent.inventoryRecord[inventoryName];
   if (typeof inventory === "undefined") {
      throw new Error(`Could not find an inventory by the name of '${inventoryName}'.`);
   }

   inventory.width = width;
   inventory.height = height;
}

export function getInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName): Inventory {
   const inventory = inventoryComponent.inventoryRecord[inventoryName];
   if (typeof inventory === "undefined") {
      throw new Error(`Could not find an inventory by the name of '${inventoryName}'.`);
   }
   
   return inventory;
}

export function inventoryHasItemType(inventory: Inventory, itemType: ItemType): boolean {
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item !== "undefined" && item.type === itemType) {
         return true;
      }
   }

   return false;
}

export function getItemTypeSlot(inventory: Inventory, itemType: ItemType): number | null {
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item !== "undefined" && item.type === itemType) {
         return itemSlot;
      }
   }

   return null;
}

/**
 * Attempts to pick up an item and add it to the inventory
 * @param itemEntity The dropped item to attempt to pick up
 * @returns Whether some non-zero amount of the item was picked up or not
 */
export function pickupItemEntity(pickingUpEntity: Entity, itemEntity: Entity): boolean {
   if (!itemEntityCanBePickedUp(itemEntity, pickingUpEntity)) return false;
   
   const inventoryComponent = InventoryComponentArray.getComponent(pickingUpEntity);
   const itemComponent = ItemComponentArray.getComponent(itemEntity);

   for (const inventory of inventoryComponent.accessibleInventories) {
      const amountPickedUp = addItemToInventory(pickingUpEntity, inventory, itemComponent.item);
      itemComponent.item.count -= amountPickedUp;

      // When all of the item stack is picked up, don't attempt to add to any other inventories.
      if (itemComponent.item.count === 0) {
         break;
      }
   }

   // If all of the item was added, destroy it
   if (itemComponent.item.count === 0) {
      destroyEntity(itemEntity);
      return true;
   }

   return false;
}

/**
 * Adds as much of an item as possible to any/all available inventories.
 * @returns The number of items added.
 */
export function addItem(entity: Entity, inventoryComponent: InventoryComponent, item: Item): number {
   let amountAdded = 0;

   for (const inventory of inventoryComponent.accessibleInventories) {
      amountAdded += addItemToInventory(entity, inventory, item);

      if (amountAdded === item.count) {
         break;
      }
   }

   return amountAdded;
}

/**
 * Adds as much of an item as possible to a specific inventory.
 * @returns The number of items added to the inventory
 */
export function addItemToInventory(entity: Entity, inventory: Inventory, item: Item): number {
   let remainingAmountToAdd = item.count;
   let amountAdded = 0;

   const isStackable = itemIsStackable(item.type);

   if (isStackable) {
      const stackSize = (ITEM_INFO_RECORD[item.type] as StackableItemInfo).stackSize;
      
      // If there is already an item of the same type in the inventory, add it there
      for (let i = 0; i < inventory.items.length; i++) {
         const currentItem = inventory.items[i];

         // If the item is of the same type, add it
         if (currentItem.type === item.type) {
            const maxAddAmount = Math.min(stackSize - currentItem.count, remainingAmountToAdd);
            
            currentItem.count += maxAddAmount;
            remainingAmountToAdd -= maxAddAmount;
            amountAdded += maxAddAmount;
            if (maxAddAmount > 0) {
               registerDirtyEntity(entity);
            }

            if (remainingAmountToAdd === 0) return amountAdded;
         }
      }
   }
   
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      // If the slot is empty then add the rest of the item
      if (typeof inventory.itemSlots[itemSlot] === "undefined") {
         let addAmount: number;
         if (isStackable) {
            const stackSize = (ITEM_INFO_RECORD[item.type] as StackableItemInfo).stackSize;
            addAmount = Math.min(stackSize, remainingAmountToAdd);
         } else {
            addAmount = 1;
         }

         const newItem = createItem(item.type, addAmount, item.nickname, item.namer);
         inventory.addItem(newItem, itemSlot);

         amountAdded += addAmount;
         remainingAmountToAdd -= addAmount;
         if (remainingAmountToAdd === 0) {
            break;
         }
      }
   }

   if (amountAdded > 0) {
      registerDirtyEntity(entity);
   }
   return amountAdded;
}

/**
 * Attempts to add a certain amount of an item to a specific item slot in an inventory.
 * @param inventoryName The name of the inventory to add the item to.
 * @param itemType The type of the item.
 * @param amount The amount of item to attempt to add.
 * @returns The number of items added to the item slot.
 */
export function addItemToSlot(entity: Entity, inventoryComponent: InventoryComponent, inventoryName: InventoryName, itemSlot: number, item: Item, amount: number): number {
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   if (itemSlot < 1 || itemSlot > inventory.width * inventory.height) {
      console.warn("Added item to out-of-bounds slot!");
   }

   let amountAdded: number;

   const existingItem = inventory.itemSlots[itemSlot];
   if (typeof existingItem !== "undefined") {
      if (existingItem.type !== item.type) {
         // Items are of different types, so none can be added
         return 0;
      }

      // If the item is stackable, add as many as the stack size of the item would allow
      if (itemIsStackable(item.type)) {
         const stackSize = (ITEM_INFO_RECORD[item.type] as StackableItemInfo).stackSize;
         
         amountAdded = Math.min(amount, stackSize - existingItem.count);
         existingItem.count += amountAdded;
         registerDirtyEntity(entity);
      } else {
         // Unstackable items cannot be stacked (crazy right), so no more can be added
         return 0;
      }
   } else {
      amountAdded = amount;
      inventory.addItem(createItem(item.type, item.count, item.nickname, item.namer), itemSlot);
      registerDirtyEntity(entity);
   }

   return amountAdded;
}

/**
 * Attempts to consume a certain amount of an item type from an inventory.
 * @returns The number of items consumed from the inventory.
*/
export function consumeItemTypeFromInventory(entity: Entity, inventoryComponent: InventoryComponent, inventoryName: InventoryName, itemType: ItemType, amount: number): number {
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   let remainingAmountToConsume = amount;
   let totalAmountConsumed = 0;
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item === "undefined" || item.type !== itemType) continue;

      const amountConsumed = Math.min(remainingAmountToConsume, item.count);

      item.count -= amountConsumed;
      remainingAmountToConsume -= amountConsumed;
      totalAmountConsumed += amountConsumed;

      if (item.count === 0) {
         inventory.removeItem(itemSlot);
         registerDirtyEntity(entity);
      }
   }

   return totalAmountConsumed;
}

export function consumeItemType(entity: Entity, inventoryComponent: InventoryComponent, itemType: ItemType, amount: number) {
   let amountRemainingToConsume = amount;

   for (let i = 0; i < inventoryComponent.inventories.length && amountRemainingToConsume > 0; i++) {
      const inventory = inventoryComponent.inventories[i];
      amountRemainingToConsume -= consumeItemTypeFromInventory(entity, inventoryComponent, inventory.name, itemType, amountRemainingToConsume);
   }
}

/**
 * @returns The amount of items consumed
 */
export function consumeItemFromSlot(entity: Entity, inventory: Inventory, itemSlot: number, amount: number): number {
   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") return 0;

   item.count -= amount;
   registerDirtyEntity(entity);

   // If all items have been removed, delete that item
   if (item.count <= 0) {
      inventory.removeItem(itemSlot);
      // As the item count is 0 or negative, we add instead of subtract
      return amount + item.count;
   }

   // If there are still items remaining, then the full amount has been consumed
   return amount;
}

/**
 * @returns True if the inventory has no item slots available, false if there is at least one
 */
export function inventoryIsFull(inventory: Inventory): boolean {
   return inventory.items.length === inventory.width * inventory.height;
}

export function findInventoryContainingItem(inventoryComponent: InventoryComponent, item: Item): Inventory | null {
   for (const inventory of inventoryComponent.inventories) {
      for (let i = 0; i < inventory.items.length; i++) {
         const currentItem = inventory.items[i];

         if (currentItem === item) {
            return inventory;
         }
      }
   }

   return null;
}

/** Returns 0 if there are no occupied slots. */
export function getFirstOccupiedItemSlotInInventory(inventory: Inventory): number {
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
         return itemSlot;
      }
   }
   
   return 0;
}

export function countItemType(inventoryComponent: InventoryComponent, itemType: ItemType): number {
   let count = 0;
   
   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      const inventory = inventoryComponent.inventories[i];

      for (let i = 0; i < inventory.items.length; i++) {
         const item = inventory.items[i];

         if (item.type === itemType) {
            count += item.count;
         }
      }
   }

   return count;
}

export function createInventoryComponentTally(inventoryComponent: InventoryComponent): ItemTally2 {
   const tally = new ItemTally2();
   
   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      const inventory = inventoryComponent.inventories[i];
      tallyInventoryItems(tally, inventory);
   }

   return tally;
}

export function hasSpaceForRecipe(inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: InventoryName): boolean {
   // Don't craft if there isn't space
   const outputInventory = getInventory(inventoryComponent, outputInventoryName);
   for (let itemSlot = 1; itemSlot <= outputInventory.width * outputInventory.height; itemSlot++) {
      const item = outputInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         return true;
      }

      if (item.type === recipe.product && itemIsStackable(recipe.product) && item.count + recipe.yield <= getItemStackSize(item.type)) {
         return true;
      }
   }

   return false;
}

export function inventoryComponentCanAffordRecipe(inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: InventoryName): boolean {
   if (!hasSpaceForRecipe(inventoryComponent, recipe, outputInventoryName)) {
      return false;
   }

   const inventoryComponentTally = createInventoryComponentTally(inventoryComponent);
   return inventoryComponentTally.fullyCoversOtherTally(recipe.ingredients);
}

export function craftRecipe(entity: Entity, inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: InventoryName): void {
   // Consume ingredients
   for (const tallyEntry of recipe.ingredients.getEntries()) {
      const ingredientType = tallyEntry.itemType;
      const ingredientCount = tallyEntry.count;
      
      for (let remainingAmountToConsume = ingredientCount, i = 0; remainingAmountToConsume > 0 && i < inventoryComponent.inventories.length; i++) {
         const inventory = inventoryComponent.inventories[i];
         remainingAmountToConsume -= consumeItemTypeFromInventory(entity, inventoryComponent, inventory.name, ingredientType, ingredientCount);
      }
   }

   // Add product to output inventory
   const outputInventory = getInventory(inventoryComponent, outputInventoryName);
   addItemToInventory(entity, outputInventory, createItem(recipe.product, recipe.yield, "", ""));
}

function getDataLength(entity: Entity): number {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);

   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      const inventory = inventoryComponent.inventories[i];
      lengthBytes += getInventoryDataLength(inventory);
   }

   return lengthBytes;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entity);

   packet.writeNumber(inventoryComponent.inventories.length);
   
   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      const inventory = inventoryComponent.inventories[i];
      addInventoryDataToPacket(packet, inventory);
   }
}

export function hasInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName): boolean {
   return typeof inventoryComponent.inventoryRecord[inventoryName] !== "undefined";
}