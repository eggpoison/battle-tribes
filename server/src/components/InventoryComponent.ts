import { InventoryComponentData } from "webgl-test-shared/dist/components";
import { ItemTally, CraftingRecipe, CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { Inventory, Item, ItemType, itemIsStackable, ITEM_INFO_RECORD, StackableItemInfo, getItemStackSize } from "webgl-test-shared/dist/items";
import Entity from "../Entity";
import { createItemEntity, itemEntityCanBePickedUp } from "../entities/item-entity";
import { InventoryComponentArray, ItemComponentArray } from "./ComponentArray";
import { createItem } from "../items";

export class InventoryComponent {
   /** Stores a record of all inventories associated with the inventory component. */
   public readonly inventoryRecord: Record<string, Inventory> = {};
   /** Stores all inventories associated with the inventory component in the order of when they were added. */
   public readonly inventories = new Array<Inventory>();
   public readonly accessibleInventories = new Array<Inventory>();
}

/** Creates and stores a new inventory in the component. */
export function createNewInventory(inventoryComponent: InventoryComponent, name: string, width: number, height: number, acceptsPickedUpItems: boolean): Inventory {
   if (inventoryComponent.inventoryRecord.hasOwnProperty(name)) throw new Error(`Tried to create an inventory when an inventory by the name of '${name}' already exists.`);
   
   const inventory: Inventory = {
      width: width,
      height: height,
      itemSlots: {},
      name: name
   };

   inventoryComponent.inventoryRecord[name] = inventory;
   inventoryComponent.inventories.push(inventory);

   if (acceptsPickedUpItems) {
      inventoryComponent.accessibleInventories.push(inventory);
   }

   return inventory;
}

export function resizeInventory(inventoryComponent: InventoryComponent, name: string, width: number, height: number): void {
   if (!inventoryComponent.inventoryRecord.hasOwnProperty(name)) throw new Error(`Could not find an inventory by the name of '${name}'.`);

   inventoryComponent.inventoryRecord[name].width = width;
   inventoryComponent.inventoryRecord[name].height = height;
}

export function getInventory(inventoryComponent: InventoryComponent, name: string): Inventory {
   if (!inventoryComponent.inventoryRecord.hasOwnProperty(name)) {
      throw new Error(`Could not find an inventory by the name of '${name}'.`);
   }
   
   return inventoryComponent.inventoryRecord[name];
}

export function getItemFromInventory(inventory: Inventory, itemSlot: number): Item | null {
   return inventory.itemSlots[itemSlot];
}

export function inventoryHasItemInSlot(inventory: Inventory, itemSlot: number): boolean {
   return inventory.itemSlots.hasOwnProperty(itemSlot);
}

export function getItem(inventoryComponent: InventoryComponent, inventoryName: string, itemSlot: number): Item | null {
   const inventory = getInventory(inventoryComponent, inventoryName);
   if (inventoryHasItemInSlot(inventory, itemSlot)) {
      return getItemFromInventory(inventory, itemSlot);
   }
   return null;
}

export function setItem(inventoryComponent: InventoryComponent, inventoryName: string, itemSlot: number, item: Item | null): void {
   const inventory = getInventory(inventoryComponent, inventoryName);

   if (item !== null) {
      inventory.itemSlots[itemSlot] = item;
   } else {
      delete inventory.itemSlots[itemSlot];
   }
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

export function getItemTypeSlot(inventory: Inventory, itemType: ItemType): number {
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      const item = inventory.itemSlots[itemSlot];
      if (typeof item !== "undefined" && item.type === itemType) {
         return itemSlot;
      }
   }

   throw new Error("Item type not in inventory")
}

/**
 * Attempts to pick up an item and add it to the inventory
 * @param itemEntity The dropped item to attempt to pick up
 * @returns Whether some non-zero amount of the item was picked up or not
 */
export function pickupItemEntity(entity: Entity, itemEntity: Entity): boolean {
   if (!itemEntityCanBePickedUp(itemEntity, entity.id)) return false;
   
   const inventoryComponent = InventoryComponentArray.getComponent(entity.id);
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
      itemEntity.remove();
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
export function addItemToInventory(inventoryComponent: InventoryComponent, inventoryName: string, itemType: ItemType, itemAmount: number): number {
   let remainingAmountToAdd = itemAmount;
   let amountAdded = 0;

   const isStackable = itemIsStackable(itemType);
   const inventory = getInventory(inventoryComponent, inventoryName);

   if (isStackable) {
      const stackSize = (ITEM_INFO_RECORD[itemType] as StackableItemInfo).stackSize;
      
      // If there is already an item of the same type in the inventory, add it there
      for (const [itemSlot, currentItem] of Object.entries(inventory.itemSlots) as unknown as ReadonlyArray<[number, Item]>) {
         // If the item is of the same type, add it
         if (currentItem.type === itemType) {
            const maxAddAmount = Math.min(stackSize - currentItem.count, remainingAmountToAdd);
            inventory.itemSlots[itemSlot].count += maxAddAmount;
            remainingAmountToAdd -= maxAddAmount;
            amountAdded += maxAddAmount;

            if (remainingAmountToAdd === 0) return amountAdded;
         }
      }
   }
   
   for (let i = 1; i <= inventory.width * inventory.height; i++) {
      // If the slot is empty then add the rest of the item
      if (!inventory.itemSlots.hasOwnProperty(i)) {
         let addAmount: number;
         if (isStackable) {
            const stackSize = (ITEM_INFO_RECORD[itemType] as StackableItemInfo).stackSize;
            addAmount = Math.min(stackSize, remainingAmountToAdd);
         } else {
            addAmount = 1;
         }

         inventory.itemSlots[i] = createItem(itemType, addAmount);

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
export function addItemToSlot(inventoryComponent: InventoryComponent, inventoryName: string, itemSlot: number, itemType: ItemType, amount: number): number {
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   if (itemSlot < 1 || itemSlot > inventory.width * inventory.height) {
      console.warn("Added item to out-of-bounds slot!");
   }

   let amountAdded: number;

   if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
      const item = getItem(inventoryComponent, inventoryName, itemSlot)!;

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
      inventory.itemSlots[itemSlot] = createItem(itemType, amount);
   }

   return amountAdded;
}

/**
 * Attempts to consume a certain amount of an item type from an inventory.
 * @returns The number of items consumed from the inventory.
*/
export function consumeItemTypeFromInventory(inventoryComponent: InventoryComponent, inventoryName: string, itemType: ItemType, amount: number): number {
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   let remainingAmountToConsume = amount;
   let totalAmountConsumed = 0;
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (!inventory.itemSlots.hasOwnProperty(itemSlot)) continue;

      const item = inventory.itemSlots[itemSlot];
      if (item.type !== itemType) continue;

      const amountConsumed = Math.min(remainingAmountToConsume, item.count);

      item.count -= amountConsumed;
      remainingAmountToConsume -= amountConsumed;
      totalAmountConsumed += amountConsumed;

      if (item.count === 0) {
         delete inventory.itemSlots[itemSlot];
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
export function consumeItemFromSlot(inventoryComponent: InventoryComponent, inventoryName: string, itemSlot: number, amount: number): number {
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") return 0;

   item.count -= amount;

   // If all items have been removed, delete that item
   if (item.count <= 0) {
      delete inventory.itemSlots[itemSlot];
      // As the item count is 0 or negative, we add instead of subtract
      return amount + item.count;
   }

   // If there are still items remaining, then the full amount has been consumed
   return amount;
}

export function removeItemFromInventory(inventoryComponent: InventoryComponent, inventoryName: string, itemSlot: number): void {
   const inventory = getInventory(inventoryComponent, inventoryName);

   delete inventory.itemSlots[itemSlot];
}

/**
 * @returns True if the inventory has no item slots available, false if there is at least one
 */
export function inventoryIsFull(inventoryComponent: InventoryComponent, inventoryName: string): boolean {
   const inventory = getInventory(inventoryComponent, inventoryName);

   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (!inventory.itemSlots.hasOwnProperty(itemSlot)) {
         return false;
      }
   }

   return true;
}

export function dropInventory(entity: Entity, inventoryComponent: InventoryComponent, inventoryName: string, dropRange: number): void {
   const inventory = getInventory(inventoryComponent, inventoryName);
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
         const position = entity.position.copy();

         const spawnOffsetMagnitude = dropRange * Math.random();
         const spawnOffsetDirection = 2 * Math.PI * Math.random();
         position.x += spawnOffsetMagnitude * Math.sin(spawnOffsetDirection);
         position.y += spawnOffsetMagnitude * Math.cos(spawnOffsetDirection);
         
         const item = inventory.itemSlots[itemSlot];
         createItemEntity(position, item.type, item.count, 0);
      }
   }
}

export function findInventoryContainingItem(inventoryComponent: InventoryComponent, item: Item): Inventory | null {
   for (const inventory of inventoryComponent.inventories) {
      for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
         if (!inventory.itemSlots.hasOwnProperty(itemSlot)) {
            continue;
         }

         const currentItem = inventory.itemSlots[itemSlot];
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

      for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
         if (inventory.itemSlots.hasOwnProperty(itemSlot)) {
            const item = inventory.itemSlots[itemSlot];
            if (item.type === itemType) {
               count += item.count;
            }
         }
      }
   }

   return count;
}

export function tallyInventoryItems(tally: ItemTally, inventory: Inventory): void {
   for (const item of Object.values(inventory.itemSlots)) {
      if (!tally.hasOwnProperty(item.type)) {
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

export function inventoryComponentCanAffordRecipe(inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: string): boolean {
   // Don't craft if there isn't space
   let hasSpace = false;
   const outputInventory = getInventory(inventoryComponent, outputInventoryName);
   for (let itemSlot = 1; itemSlot <= outputInventory.width * outputInventory.height; itemSlot++) {
      if (outputInventory.itemSlots[itemSlot] === undefined) {
         hasSpace = true;
         break;
      }

      const item = outputInventory.itemSlots[itemSlot];
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

export function craftRecipe(inventoryComponent: InventoryComponent, recipe: CraftingRecipe, outputInventoryName: string): void {
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