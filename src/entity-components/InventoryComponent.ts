import Board from "../Board";
import Component from "../Component";
import Resource from "../entities/Resource";
import ITEMS, { ItemName } from "../items";
import Item from "../items/Item";

export type ItemSlots = Array<[ItemName, number]>;

export type ItemList = Partial<Record<ItemName, number>>;

class InventoryComponent extends Component {
   private itemSlots: ItemSlots = new Array<[ItemName, number]>();
   private availableSlotCount: number;

   constructor(availableSlotCount: number) {
      super();

      this.availableSlotCount = availableSlotCount;
   }

   public setAvailableSlots(newAvailableSlotCount: number): void {
      this.availableSlotCount = newAvailableSlotCount;
   }

   public pickupResource(resource: Resource): void {
      const item = resource.item;

      const didAdd = this.addItem(item);
      if (didAdd) Board.removeEntity(resource);
   }

   public addItem(item: Item, amount: number = 1): boolean {
      for (let slotNum = 0; slotNum < this.availableSlotCount; slotNum++) {
         // If the slot is available, add the item to the slot
         if (typeof this.itemSlots[slotNum] === "undefined") {
            this.itemSlots[slotNum] = [item.name, amount];
            return true;
         }

         let [itemName, itemCount] = this.itemSlots[slotNum];
         const itemKey = ItemName[itemName] as unknown as ItemName;
         const itemInfo = ITEMS[itemKey];

         // If the existing item is of the same type and the stack isn't full, add it
         if (itemName === item.name && itemCount + amount <= itemInfo.stackSize) {
            this.itemSlots[slotNum][1] += amount;
            return true;
         }
      }
      return false;
   }

   public addItemToSlot(slotNum: number, itemName: ItemName, amount: number = 1): void {
      let remainingAddAmount = amount;

      const slot = this.itemSlots[slotNum];
      const itemKey = ItemName[itemName] as unknown as ItemName;
      const itemInfo = ITEMS[itemKey];

      // If the slot is empty initialise the slot
      if (typeof slot === "undefined") {
         this.itemSlots[slotNum] = [itemName, 0];
      }

      {
         const addAmount = Math.min(amount, itemInfo.stackSize - this.itemSlots[slotNum][1]);
         this.itemSlots[slotNum][1] += addAmount;

         if (addAmount === amount) {
            // If all of the item was added, no need to overflow
            return;
         }

         remainingAddAmount -= addAmount;
      }


      // TODO: Overflow add
   }

   public removeItem(slotNum: number, amount: number = 1): void {
      const itemName = this.itemSlots[slotNum][0];

      let remainingRemoveAmount = amount;
      for (let currentSlotNum = 0; currentSlotNum < this.availableSlotCount; currentSlotNum++) {
         // If the slot if empty skip it
         if (typeof this.itemSlots[currentSlotNum] === "undefined") {
            continue;
         }

         let [currentItemName, itemCount] = this.itemSlots[currentSlotNum];

         if (currentItemName === itemName) {
            const removeAmount = Math.min(remainingRemoveAmount, itemCount);
            remainingRemoveAmount -= removeAmount;
            itemCount -= removeAmount;

            if (itemCount === 0) {
               delete this.itemSlots[currentSlotNum];
            }
            continue;
         }
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
}

export default InventoryComponent;