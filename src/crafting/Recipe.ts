import { ItemList } from "../entity-components/inventory/InventoryComponent";
import ITEMS, { ItemName } from "../items/items";
import Item from "../items/Item";

class Recipe {
   public readonly result: Item;
   public readonly materials: ItemList;
   public readonly craftAmount: number;

   constructor(resultName: ItemName, materials: ItemList, craftAmount: number) {
      this.result = ITEMS[resultName];
      this.materials = materials;
      this.craftAmount = craftAmount;
   }

   public canAfford(availableItems: ItemList) {
      for (const [itemName, costCount] of Object.entries(this.materials)) {
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