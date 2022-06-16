import ITEMS, { ItemName } from "../../items/items";
import InventoryComponent from "./InventoryComponent";

class InfiniteInventoryComponent extends InventoryComponent {
   public getItemAddAmount(itemName: ItemName, amount: number, slotNum?: number): number | null {
      if (typeof slotNum === "undefined") return amount;

      const slotInfo = this.itemSlots[slotNum];
      const slotItemInfo = ITEMS[slotInfo[0]];

      if (typeof slotInfo === "undefined") {
         // If the slot is empty, return the max amount
         return amount;
      } else {
         // If the item is of a different type, then none can be added
         if (slotInfo[0] !== itemName) return null;

         const addAmount = Math.min(amount, slotItemInfo.stackSize - slotInfo[1]);
         return addAmount;
      }
   }

   public addItem(itemName: ItemName, amount: number = 1): number {
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
         for (let slotNum = 0; ; slotNum++) {
            // If the slot is available, add the item to the slot
            if (typeof this.itemSlots[slotNum] === "undefined") {
               this.itemSlots[slotNum] = [itemName, remainingAmountToAdd];
               remainingAmountToAdd -= remainingAmountToAdd;

               break;
            }
         }
      }

      this.callInventoryChangeEvents();

      return amount;
   }
}

export default InfiniteInventoryComponent;