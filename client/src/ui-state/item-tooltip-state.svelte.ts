import { Item } from "../../../shared/src";

let item = $state<Item | null>(null);

export const itemTooltipState = {
   get item() {
      return item;
   },
   setItem(newItem: Item | null): void {
      item = newItem;
   }
};