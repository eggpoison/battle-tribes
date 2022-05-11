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
}

export default Item;