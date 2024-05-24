import { InventoryComponentData } from "webgl-test-shared/dist/components";
import { ItemTally, CraftingRecipe, CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { Inventory, Item, ItemType, itemIsStackable, ITEM_INFO_RECORD, StackableItemInfo, getItemStackSize, InventoryName } from "webgl-test-shared/dist/items";
import Entity from "../Entity";
import { createItemEntity, itemEntityCanBePickedUp } from "../entities/item-entity";
import { ComponentArray } from "./ComponentArray";
import { createItem } from "../items";
import Board from "../Board";
import { ItemComponentArray } from "./ItemComponent";

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
}

export const InventoryComponentArray = new ComponentArray<InventoryComponent>(true, undefined, onRemove);

const dropInventory = (entity: Entity, inventory: Inventory, dropRange: number): void => {
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      const position = entity.position.copy();

      const spawnOffsetMagnitude = dropRange * Math.random();
      const spawnOffsetDirection = 2 * Math.PI * Math.random();
      position.x += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
      position.y += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
      
      createItemEntity(position, 2 * Math.PI * Math.random(), item.type, item.count, 0);
   }
}

function onRemove(entityID: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   
   // @Hack
   const entity = Board.entityRecord[entityID]!;
   
   for (let i = 0; i < inventoryComponent.droppableInventories.length; i++) {
      const inventory = inventoryComponent.droppableInventories[i];

      // @Incomplete: Don't use a drop range. Instead pick a random point in any of the entities hitboxes, weighted by their area.
      dropInventory(entity, inventory, 38);
   }
}

/** Creates and stores a new inventory in the component. */
export function createNewInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName, width: number, height: number, options: InventoryOptions): Inventory {
   if (typeof inventoryComponent.inventoryRecord[inventoryName] !== "undefined") {
      throw new Error(`Tried to create an inventory when an inventory by the name of '${inventoryName}' already exists.`);
   }
   
   const inventory = new Inventory(width, height, inventoryName);

   inventoryComponent.inventoryRecord[inventoryName] = inventory;
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
export function pickupItemEntity(pickingUpEntityID: number, itemEntity: Entity): boolean {
   if (!itemEntityCanBePickedUp(itemEntity, pickingUpEntityID)) return false;
   
   const inventoryComponent = InventoryComponentArray.getComponent(pickingUpEntityID);
   const itemComponent = ItemComponentArray.getComponent(itemEntity.id);

   for (const inventory of inventoryComponent.accessibleInventories) {
      const amountPickedUp = addItemToInventory(inventoryComponent, inventory.name, itemComponent.itemType, itemComponent.amount);
      itemComponent.amount -= amountPickedUp;

      // When all of the item stack is picked up, don't attempt to add to any other inventories.
      if (itemComponent.amount === 0) {
         break;
      }
   }

   // If all of the item was added, destroy it
   if (itemComponent.amount === 0) {
      itemEntity.destroy();
      return true;
   }

   return false;
}

/**
 * Adds as much of an item as possible to any/all available inventories.
 * @returns The number of items added.
 */
export function addItem(inventoryComponent: InventoryComponent, item: Item): number {
   let amountAdded = 0;

   for (const inventory of inventoryComponent.accessibleInventories) {
      amountAdded += addItemToInventory(inventoryComponent, inventory.name, item.type, item.count);

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
export function addItemToInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName, itemType: ItemType, itemAmount: number): number {
   let remainingAmountToAdd = itemAmount;
   let amountAdded = 0;

   const isStackable = itemIsStackable(itemType);
   const inventory = getInventory(inventoryComponent, inventoryName);

   if (isStackable) {
      const stackSize = (ITEM_INFO_RECORD[itemType] as StackableItemInfo).stackSize;
      
      // If there is already an item of the same type in the inventory, add it there
      for (let i = 0; i < inventory.items.length; i++) {
         const item = inventory.items[i];

         // If the item is of the same type, add it
         if (item.type === itemType) {
            const maxAddAmount = Math.min(stackSize - item.count, remainingAmountToAdd);
            
            item.count += maxAddAmount;
            remainingAmountToAdd -= maxAddAmount;
            amountAdded += maxAddAmount;

            if (remainingAmountToAdd === 0) return amountAdded;
         }
      }
   }
   
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      // If the slot is empty then add the rest of the item
      if (typeof inventory.itemSlots[itemSlot] === "undefined") {
         let addAmount: number;
         if (isStackable) {
            const stackSize = (ITEM_INFO_RECORD[itemType] as StackableItemInfo).stackSize;
            addAmount = Math.min(stackSize, remainingAmountToAdd);
         } else {
            addAmount = 1;
         }

         const item = createItem(itemType, addAmount);
         inventory.addItem(item, itemSlot);

         amountAdded += addAmount;
         remainingAmountToAdd -= addAmount;
         if (remainingAmountToAdd === 0) {
            break;
         }
      }
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
export function addItemToSlot(inventoryComponent: InventoryComponent, inventoryName: InventoryName, itemSlot: number, itemType: ItemType, amount: number): number {
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   if (itemSlot < 1 || itemSlot > inventory.width * inventory.height) {
      console.warn("Added item to out-of-bounds slot!");
   }

   let amountAdded: number;

   const item = inventory.itemSlots[itemSlot];
   if (typeof item !== "undefined") {
      if (item.type !== itemType) {
         // Items are of different types, so none can be added
         return 0;
      }

      // If the item is stackable, add as many as the stack size of the item would allow
      if (itemIsStackable(itemType)) {
         const stackSize = (ITEM_INFO_RECORD[itemType] as StackableItemInfo).stackSize;
         
         amountAdded = Math.min(amount, stackSize - item.count);
         item.count += amountAdded;
      } else {
         // Unstackable items cannot be stacked (crazy right), so no more can be added
         return 0;
      }
   } else {
      amountAdded = amount;

      const item = createItem(itemType, amount);
      inventory.addItem(item, itemSlot);
   }

   return amountAdded;
}

/**
 * Attempts to consume a certain amount of an item type from an inventory.
 * @returns The number of items consumed from the inventory.
*/
export function consumeItemTypeFromInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName, itemType: ItemType, amount: number): number {
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
      }
   }

   return totalAmountConsumed;
}

export function consumeItemType(inventoryComponent: InventoryComponent, itemType: ItemType, amount: number) {
   let amountRemainingToConsume = amount;

   for (let i = 0; i < inventoryComponent.inventories.length, amountRemainingToConsume > 0; i++) {
      const inventory = inventoryComponent.inventories[i];
      amountRemainingToConsume -= consumeItemTypeFromInventory(inventoryComponent, inventory.name, itemType, amountRemainingToConsume);
   }
}

/**
 * @returns The amount of items consumed
 */
export function consumeItemFromSlot(inventory: Inventory, itemSlot: number, amount: number): number {
   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") return 0;

   item.count -= amount;

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

export function tallyInventoryItems(tally: ItemTally, inventory: Inventory): void {
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];
      
      if (typeof tally[item.type] === "undefined") {
         tally[item.type] = item.count;
      } else {
         tally[item.type]! += item.count;
      }
   }
}

export function tallyInventoryComponentItems(tally: ItemTally, inventoryComponent: InventoryComponent): void {
   for (let i = 0; i < inventoryComponent.inventories.length; i++) {
      const inventory = inventoryComponent.inventories[i];
      tallyInventoryItems(tally, inventory);
   }
}

export function inventoryComponentCanAffordRecipe(inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: InventoryName): boolean {
   // Don't craft if there isn't space
   let hasSpace = false;
   const outputInventory = getInventory(inventoryComponent, outputInventoryName);
   for (let itemSlot = 1; itemSlot <= outputInventory.width * outputInventory.height; itemSlot++) {
      const item = outputInventory.itemSlots[itemSlot];
      if (typeof item === "undefined") {
         hasSpace = true;
         break;
      }

      if (item.type === recipe.product && itemIsStackable(recipe.product) && item.count + recipe.yield <= getItemStackSize(item)) {
         hasSpace = true;
         break;
      }
   }
   if (!hasSpace) {
      return false;
   }
   
   const tally: ItemTally = {};
   tallyInventoryComponentItems(tally, inventoryComponent);

   // @Speed
   for (const [ingredientType, ingredientCount] of Object.entries(recipe.ingredients).map(entry => [Number(entry[0]), entry[1]]) as ReadonlyArray<[ItemType, number]>) {
      if (!tally.hasOwnProperty(ingredientType) || tally[ingredientType]! < ingredientCount) {
         return false;
      }
   }

   return true;
}

export function recipeCraftingStationIsAvailable(availableCraftingStations: ReadonlyArray<CraftingStation>, recipe: CraftingRecipe): boolean {
   if (typeof recipe.craftingStation === "undefined") {
      return true;
   }

   return availableCraftingStations.indexOf(recipe.craftingStation) !== -1;
}

export function craftRecipe(inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: InventoryName): void {
   // Consume ingredients
   for (const [ingredientType, ingredientCount] of Object.entries(recipe.ingredients).map(entry => [Number(entry[0]), entry[1]]) as ReadonlyArray<[ItemType, number]>) {
      for (let remainingAmountToConsume = ingredientCount, i = 0; remainingAmountToConsume > 0 && i < inventoryComponent.inventories.length; i++) {
         const inventory = inventoryComponent.inventories[i];
         remainingAmountToConsume -= consumeItemTypeFromInventory(inventoryComponent, inventory.name, ingredientType, ingredientCount);
      }
   }

   // Add product to held item
   addItemToInventory(inventoryComponent, outputInventoryName, recipe.product, recipe.yield);
}

export function serialiseInventoryComponent(entity: Entity): InventoryComponentData {
   const inventoryComponent = InventoryComponentArray.getComponent(entity.id);
   return {
      inventories: inventoryComponent.inventoryRecord
   };
}

export function hasInventory(inventoryComponent: InventoryComponent, inventoryName: InventoryName): boolean {
   return typeof inventoryComponent.inventoryRecord[inventoryName] !== "undefined";
}