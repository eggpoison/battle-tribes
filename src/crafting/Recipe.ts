import { ItemList } from "../entity-components/InventoryComponent";
import ITEMS, { ItemName } from "../items";
import Item from "../items/Item";

class Recipe {
   private readonly result: Item;
   private readonly costs: ItemList;

   constructor(resultName: ItemName, costs: ItemList) {
      this.result = ITEMS[resultName];
      this.costs = costs;
   }

   public canAfford(availableItems: ItemList) {
      for (const [itemName, costCount] of Object.entries(this.costs)) {
         // If the item isn't available
         if (!availableItems.hasOwnProperty(itemName)) {
            return false;
         }

         // If there aren't enough available items to craft the recipe
         const availableCount = availableItems[itemName as unknown as ItemName]!;
         if (availableCount < costCount) {
            return false;
         }
      }

      return true;
   }
}

export default Recipe;