import Entity from "../entities/Entity";
import InventoryComponent from "../entity-components/inventory/InventoryComponent";
import ITEMS, { ItemName } from "./items";

export interface ItemInfo {
   readonly displayName: string;
   readonly description: string;
   readonly imageSrc: string;
   readonly stackSize: number;
}

class Item implements ItemInfo {
   public readonly displayName: string;
   public readonly description: string;
   public readonly imageSrc: string;
   public readonly stackSize: number;

   constructor(itemInfo: ItemInfo) {
      this.displayName = itemInfo.displayName;
      this.description = itemInfo.description;
      this.imageSrc = itemInfo.imageSrc;
      this.stackSize = itemInfo.stackSize;
   }

   public get name(): ItemName {
      for (const [itemName, item] of Object.entries(ITEMS)) {
         if (item === this) {
            return ItemName[itemName as keyof typeof ItemName];
         }
      }

      throw new Error("Cannot find item name!");
   }

   public startUse?(entity: Entity, inventoryComponent: InventoryComponent, slotNum: number): void;

   public duringUse?(entity: Entity, inventoryComponent: InventoryComponent, slotNum: number): void;

   public endUse(_entity: Entity, inventoryComponent: InventoryComponent, slotNum: number): void {
      // Remove one of the item from the inventory
      inventoryComponent.removeItemFromSlot(slotNum, 1);
   }
}

export default Item;