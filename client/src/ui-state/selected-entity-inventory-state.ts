import { Inventory } from "../../../shared/src"

let inventories: ReadonlyArray<Inventory> = new Array<Inventory>();

export const selectedEntityInventoryState = {
   get inventories() {
      return inventories;
   },
   setInventories(newInventories: ReadonlyArray<Inventory>): void {
      inventories = newInventories;
   }
};