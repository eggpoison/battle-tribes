import ITEMS, { ItemName } from "../../items/items";
import InventoryComponent from "./InventoryComponent";

class InfiniteInventoryComponent extends InventoryComponent {
   public getItemAddAmount(itemName: ItemName, amount: number, slotNum?: number): number | null {
      if (typeof slotNum === "undefined") return amount;

      const slotInfo = this.itemSlots[slotNum];
      const slotItemInfo = ITEMS[ItemName[slotInfo[0]] as unknown as ItemName];

      if (typeof slotInfo === "undefined") {
         // If the slot is empty, return the max amount
         return amount;
      } else {
         // If the item is of a different type, then none can be added
         if (slotInfo[0] !== itemName) return null;

         const addAmount = slotItemInfo.stackSize - slotInfo[1];
         return addAmount;
      }
   }

   public addItem(itemName: ItemName, amount: number = 1): void {
      for (let slotNum = 0; ; slotNum++) {
         // If the slot is available, add the item to the slot
         if (typeof this.itemSlots[slotNum] === "undefined") {
            this.itemSlots[slotNum] = [itemName, amount];
            return;
         }

         let [currentItemName, currentItemCount] = this.itemSlots[slotNum];
         const itemInfo = ITEMS[ItemName[currentItemName] as unknown as ItemName];

         // If the existing item is of the same type and the stack isn't full, add it
         if (currentItemName === itemName && currentItemCount + amount <= itemInfo.stackSize) {
            this.itemSlots[slotNum][1] += amount;
            return;
         }
      }
   }
}

export default InfiniteInventoryComponent;