import Board from "../../Board";
import Component from "../../Component";
import ItemEntity from "../../entities/ItemEntity";
import ITEMS, { ItemName } from "../../items/items";
import Item, { ItemInfo } from "../../items/Item";

export type ItemSlots = Array<[ItemName, number]>;
export type ItemList = Partial<Record<ItemName, number>>;

abstract class InventoryComponent extends Component {
   protected itemSlots: ItemSlots = new Array<[ItemName, number]>();

   public pickupResource(resource: ItemEntity): void {
      const item = resource.item;

      const addAmount = this.getItemAddAmount(item.name, 1);
      if (addAmount !== null) {
         this.addItem(item.name, addAmount);
         Board.removeEntity(resource);
      }
   }

   public abstract getItemAddAmount(itemName: ItemName, amount: number, slotNum?: number): number | null;

   public abstract addItem(itemName: ItemName, amount?: number): void;

   public addItemToSlot(slotNum: number, itemName: ItemName, amount: number = 1): void {
      const slot = this.itemSlots[slotNum];

      let itemInfo!: ItemInfo;
      if (typeof itemName === "number") {
         itemInfo = ITEMS[itemName];
      } else {
         const itemKey = ItemName[itemName] as unknown as ItemName;
         itemInfo = ITEMS[itemKey];
      }

      // If the slot is empty initialise the slot
      if (typeof slot === "undefined") {
         this.itemSlots[slotNum] = [itemName, 0];
      }

      const addAmount = Math.min(amount, itemInfo.stackSize - this.itemSlots[slotNum][1]);
      this.itemSlots[slotNum][1] += addAmount;
   }

   public removeItem(name: ItemName, amount: number): void {
      for (let slotNum = 0; slotNum < this.itemSlots.length; slotNum++) {
         const itemSlot = this.itemSlots[slotNum];
         if (itemSlot[0] === name) {
            itemSlot[1] -= amount;
            if (itemSlot[1] <= 0) delete this.itemSlots[slotNum];
            return;
         }
      }
   }

   public removeItemFromSlot(slotNum: number, amount: number = 1): void {
      if (typeof this.itemSlots[slotNum] === "undefined") throw new Error("Tried to remove an item from a slot with nothing in it!");

      this.itemSlots[slotNum][1] -= amount;
      if (this.itemSlots[slotNum][1] <= 0) {
         delete this.itemSlots[slotNum];
      }
   }

   public getItemSlots(): ItemSlots {
      return this.itemSlots;
   }

   public getItemList(): ItemList {
      const itemList: ItemList = {};

      for (const [itemName, itemCount] of this.itemSlots) {
         if (itemList.hasOwnProperty(itemName)) {
            itemList[itemName]! += itemCount;
         } else {
            itemList[itemName] = itemCount;
         }
      }

      return itemList;
   }

   public canPickupItem(item: Item): boolean {
      for (const itemSlot of this.itemSlots) {
         // If there is an item in the slot
         if (typeof itemSlot !== "undefined") {
            // If the item is of the same type and can fit
            if (item.name === itemSlot[0] && itemSlot[1] < item.stackSize) {
               return true;
            }
         } else {
            // If the item slot is empty
            return true;
         }
      }

      return false;
   }
}

export default InventoryComponent;