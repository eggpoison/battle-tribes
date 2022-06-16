import ITEMS, { ItemName } from "../../items/items";
import InventoryComponent from "./InventoryComponent";

class FiniteInventoryComponent extends InventoryComponent {
   public slotCount: number;

   constructor(availableSlotCount: number) {
      super();

      this.slotCount = availableSlotCount;
   }

   public getItemAddAmount(itemName: ItemName, amount: number, slotNum?: number): number | null {
      const itemInfo = ITEMS[itemName];

      if (typeof slotNum !== "undefined") {
         const slotInfo = this.itemSlots[slotNum];
         const slotItemInfo = ITEMS[slotInfo[0]];

         if (typeof slotInfo === "undefined") {
            // If the slot is empty, return the max amount
            return amount;
         } else {
            // If the item is of a different type, then none can be added
            if (slotInfo[0] !== itemName) return null;

            const addAmount = Math.min(slotItemInfo.stackSize - slotInfo[1], amount);
            return addAmount;
         }
      }

      let addAmount = 0;
      for (let slotNum = 0; slotNum < this.slotCount; slotNum++) {
         const slotInfo = this.itemSlots[slotNum];

         if (typeof slotInfo === "undefined") {
            return amount;
         }

         if (slotInfo[0] === itemName) {
            addAmount += itemInfo.stackSize - slotInfo[1];
         }
      }

      if (addAmount > amount) return amount;
      if (addAmount > 0) return addAmount;
      return null;
   }

   public addItem(itemName: ItemName, amount: number): number {
      // Get the item info
      const itemInfo = ITEMS[itemName];

      let remainingAmountToAdd = amount;

      // Add the item to any existing stacks in the inventory
      for (const itemSlot of this.itemSlots) {
         if (typeof itemSlot === "undefined") continue;

         const [currentItemName, currentItemAmount] = itemSlot;

         if (currentItemName === itemName) {
            // If the item can be stacked with the current item, stack them
            const addAmount = Math.min(itemInfo.stackSize - currentItemAmount, remainingAmountToAdd);
            if (addAmount > 0) {
               itemSlot[1] += addAmount;

               remainingAmountToAdd -= addAmount;

               // If all of the item has been added, don't look for any more stacks to add it to
               if (remainingAmountToAdd === 0) {
                  break;
               }
            }
         }
      }

      if (remainingAmountToAdd > 0) {
         // Add the item to any available slots
         for (let slotNum = 0; slotNum < this.slotCount; slotNum++) {
            // If the slot is available, add the item to the slot
            if (typeof this.itemSlots[slotNum] === "undefined") {
               this.itemSlots[slotNum] = [itemName, remainingAmountToAdd];
               remainingAmountToAdd -= remainingAmountToAdd;

               break;
            }
         }
      }

      this.callInventoryChangeEvents();

      return amount - remainingAmountToAdd;
   }

   public isFull(isStrict: boolean): boolean {
      for (let i = 0; i < this.slotCount; i++) {
         const item = this.itemSlots[i];
         if (typeof item === "undefined") return false;

         if (isStrict) {
            const info = ITEMS[item[0]];
            if (item[1] < info.stackSize) return false;
         }
      }

      return true;
   }
}

export default FiniteInventoryComponent;