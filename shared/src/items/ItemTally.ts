import { Inventory, ItemType } from "./items";

interface ItemTallyEntry {
   readonly itemType: ItemType;
   count: number;
}

// @Temporary: rename to ItemTally once all references to the interface ItemTally are removed
export class ItemTally2 {
   private readonly entries = new Array<ItemTallyEntry>();

   private getItemIdx(itemType: ItemType): number | null {
      for (let i = 0; i < this.entries.length; i++) {
         const entry = this.entries[i];
         if (entry.itemType === itemType) {
            return i;
         }
      }

      return null;
   }
   
   public addItem(itemType: ItemType, count: number): void {
      const idx = this.getItemIdx(itemType);
      if (idx !== null) {
         this.entries[idx].count += count;
      } else {
         this.entries.push({
            itemType: itemType,
            count: count
         });
      }
   }

   public removeItemCount(itemType: ItemType, count: number): void {
      const idx = this.getItemIdx(itemType);
      if (idx === null) {
         return;
      }

      const entry = this.entries[idx];
      entry.count -= count;
      if (entry.count <= 0) {
         this.entries.splice(idx, 1);
      }
   }
   
   /** Gets the number of items of the given type in the tally. */
   public getItemCount(itemType: ItemType): number {
      const idx = this.getItemIdx(itemType);
      return idx !== null ? this.entries[idx].count : 0;
   }

   public restrictItemCount(itemType: ItemType, maxCount: number): void {
      const idx = this.getItemIdx(itemType);
      if (idx !== null) {
         const entry = this.entries[idx];
         if (entry.count > maxCount) {
            entry.count = maxCount;
         }
      }
   }

   public getEntries(): ReadonlyArray<Readonly<ItemTallyEntry>> {
      return this.entries;
   }

   /** Given another item tally, calculates all the items in this tally which there are less of than in the other tally. */
   public getInsufficient(otherTally: ItemTally2): Array<ItemType> {
      const insufficientItemTypes = new Array<ItemType>();
      
      const otherEntries = otherTally.getEntries();
      for (let i = 0; i < otherEntries.length; i++) {
         const otherEntry = otherEntries[i];

         // See how many this tally has
         const thisCount = this.getItemCount(otherEntry.itemType);

         if (thisCount < otherEntry.count) {
            insufficientItemTypes.push(otherEntry.itemType);
         }
      }

      return insufficientItemTypes;
   }

   public fullyCoversOtherTally(otherTally: ItemTally2): boolean {
      return this.getInsufficient(otherTally).length === 0;
   }

   public copy(): ItemTally2 {
      const newTally = new ItemTally2();
      for (let i = 0; i < this.entries.length; i++) {
         const entry = this.entries[i];
         newTally.addItem(entry.itemType, entry.count);
      }
      return newTally;
   }
}

export function createTallyFromRecord(record: Partial<Record<ItemType, number>>): ItemTally2 {
   const tally = new ItemTally2();

   for (const [itemTypeString, itemCount] of Object.entries(record)) {
      const itemType = Number(itemTypeString) as ItemType;
      tally.addItem(itemType, itemCount);
   }

   return tally;
}

// @Cleanup: not used outside of this file?
export function tallyInventoryItems(tally: ItemTally2, inventory: Inventory): void {
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];
      tally.addItem(item.type, item.count);
   }
}