import Board from "../../Board";
import Component from "../../Component";
import ItemEntity from "../../entities/ItemEntity";
import ITEMS, { getItemName, ItemName } from "../../items/items";
import Item from "../../items/Item";

export type ItemSlots = Array<[ItemName, number]>;
export type ItemList = Partial<Record<ItemName, number>>;

abstract class InventoryComponent extends Component {
   protected itemSlots: ItemSlots = new Array<[ItemName, number]>();

   public pickupItemEntity(itemEntity: ItemEntity): void {
      const item = itemEntity.item;

      const itemName = ItemName[getItemName(item)] as unknown as ItemName;
      const addAmount = this.getItemAddAmount(itemName, itemEntity.amount);
      if (addAmount !== null) {
         const key = itemName;
         this.addItem(key, addAmount);
         Board.removeEntity(itemEntity);
      }
   }

   public getSlot(slotNum: number): [ItemName, number] | undefined {
      return this.itemSlots[slotNum];
   }

   public getItem(slotNum: number): Item | undefined {
      const itemSlot = this.itemSlots[slotNum];
      if (typeof itemSlot === "undefined") return undefined;

      const itemName = itemSlot[0];
      return ITEMS[itemName];
   }

   public setItem(slotNum: number, itemName: ItemName, amount: number): void {
      this.itemSlots[slotNum] = [itemName, amount];

      this.callInventoryChangeEvents();
   }

   public abstract getItemAddAmount(itemName: ItemName, amount: number, slotNum?: number): number | null;

   /**
    * @returns The number of items added
    */
   public abstract addItem(itemName: ItemName, amount?: number): number;

   /**
    * @returns The number of items added
    */
   public addItemToSlot(slotNum: number, itemName: ItemName, amount: number): number {
      const slot = this.itemSlots[slotNum];
      
      const itemInfo = ITEMS[itemName];

      // If the slot is empty initialise the slot
      if (typeof slot === "undefined") {
         this.itemSlots[slotNum] = [itemName, 0];
      }

      const addAmount = Math.min(amount, itemInfo.stackSize - this.itemSlots[slotNum][1]);
      this.itemSlots[slotNum][1] += addAmount;

      this.callInventoryChangeEvents();

      return addAmount;
   }

   public removeItem(name: ItemName, amount: number): void {
      for (let slotNum = 0; slotNum < this.itemSlots.length; slotNum++) {
         const itemSlot = this.itemSlots[slotNum];
         if (typeof itemSlot === "undefined") continue;

         if (itemSlot[0] === name) {
            itemSlot[1] -= amount;
            if (itemSlot[1] <= 0) delete this.itemSlots[slotNum];
            return;
         }
      }

      this.callInventoryChangeEvents();
   }

   public removeItemFromSlot(slotNum: number, amount: number = 1): void {
      if (typeof this.itemSlots[slotNum] === "undefined") throw new Error("Tried to remove an item from a slot with nothing in it!");

      this.itemSlots[slotNum][1] -= amount;
      if (this.itemSlots[slotNum][1] <= 0) {
         delete this.itemSlots[slotNum];
      }

      this.callInventoryChangeEvents();
   }

   public getItemSlots(): ItemSlots {
      return this.itemSlots;
   }

   public getItemList(): ItemList {
      const itemList: ItemList = {};

      for (const itemSlot of this.itemSlots) {
         if (typeof itemSlot === "undefined") continue;

         const [itemName, itemAmount] = itemSlot;
         if (itemList.hasOwnProperty(itemName)) {
            itemList[itemName]! += itemAmount;
         } else {
            itemList[itemName] = itemAmount;
         }
      }

      return itemList;
   }

   public canPickupItem(item: Item, amount: number): boolean {
      for (const itemSlot of this.itemSlots) {
         // If there is an item in the slot
         if (typeof itemSlot !== "undefined") {
            const [currentItemName, currentItemAmount] = itemSlot;

            // If the item is of the same type and it can fit
            if (getItemName(item) === currentItemName && currentItemAmount + amount <= item.stackSize) {
               return true;
            }
         } else {
            // If any item slot is empty, then it can be picked up
            return true;
         }
      }

      return false;
   }

   /** Remove all items from the inventory */
   public clear(): void {
      for (let idx = this.itemSlots.length - 1; idx >= 0; idx--) {
         const itemSlot = this.itemSlots[idx];

         // Skip empty item slots
         if (typeof itemSlot === "undefined") continue;

         // Clear the item
         delete this.itemSlots[idx];
      }

      this.callInventoryChangeEvents();
   }

   protected callInventoryChangeEvents(): void {
      this.getEntity().callEvents("inventoryChange");
   }
}

export default InventoryComponent;