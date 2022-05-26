import ITEMS, { ItemName } from "../../items/items";
import InventoryComponent from "./InventoryComponent";

class FiniteInventoryComponent extends InventoryComponent {
   public slotCount: number;

   constructor(availableSlotCount: number) {
      super();

      this.slotCount = availableSlotCount;
   }

   public getItemAddAmount(itemName: ItemName, amount: number, slotNum?: number): number | null {
      const itemInfo = ITEMS[ItemName[itemName] as unknown as ItemName];

      if (typeof slotNum !== "undefined") {
         const slotInfo = this.itemSlots[slotNum];
         const slotItemInfo = ITEMS[ItemName[slotInfo[0]] as unknown as ItemName];

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

   public addItem(itemName: ItemName, amount: number): void {
      for (let slotNum = 0; slotNum < this.slotCount; slotNum++) {
         // If the slot is available, add the item to the slot
         if (typeof this.itemSlots[slotNum] === "undefined") {
            this.itemSlots[slotNum] = [itemName, amount];
            return;
         }

         let [currentItemName, currentItemCount] = this.itemSlots[slotNum];
         const itemKey = ItemName[itemName] as unknown as ItemName;
         const itemInfo = ITEMS[itemKey];

         // If the existing item is of the same type and the stack isn't full, add it
         if (currentItemName === itemName && currentItemCount + amount <= itemInfo.stackSize) {
            this.itemSlots[slotNum][1] += amount;
            return;
         }
      }
   }

   public isFull(): boolean {
      for (let i = 0; i < this.slotCount; i++) {
         const item = this.itemSlots[i];
         if (typeof item === "undefined") return false;

         const info = ITEMS[ItemName[item[0]] as unknown as ItemName];
         if (item[1] < info.stackSize) return false;
      }

      return true;
   }
}

export default FiniteInventoryComponent;