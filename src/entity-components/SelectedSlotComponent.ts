import Component from "../Component";
import Warrior from "../entities/tribe-members/Warrior";
import Item from "../items/Item";
import ITEMS, { ItemName } from "../items/items";
import FiniteInventoryComponent from "./inventory/FiniteInventoryComponent";

class SelectedSlotComponent extends Component {
   private selectedSlot: number = 0;

   private inventory!: FiniteInventoryComponent;

   private isUsingItem: boolean = false;

   onLoad(): void {
      this.inventory = this.getEntity().getComponent(FiniteInventoryComponent)!;
   }

   public tick(): void {
      if (this.isUsingItem) {
         // Use the current item
         const item = this.getSelectedItem();
         if (item !== null) {
            if (typeof item.duringRightClick !== "undefined") item.duringRightClick(this.getEntity() as Warrior, this.inventory, this.selectedSlot);
         }
      }
   }

   public changeSlot(newSlot: number): void {
      this.selectedSlot = newSlot;
   }

   public getSlot(): number {
      return this.selectedSlot;
   }

   public getSelectedItemName(): ItemName | null {
      const itemSlot = this.inventory.getItem(this.selectedSlot)
      return typeof itemSlot !== "undefined" ? itemSlot[0] : null;
   }

   private getSelectedItem(): Item | null {
      const itemSlot = this.inventory.getItemSlots()[this.selectedSlot];
      if (typeof itemSlot !== "undefined") {
         const itemName = itemSlot[0];
         const item = ITEMS[itemName as ItemName];
         return item;
      } else {
         return null;
      }
   }

   public startLeftClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;
         
      // Use it
      if (typeof item.startLeftClick !== "undefined") item.startLeftClick(this.getEntity() as Warrior, this.inventory, this.selectedSlot);
   }

   public endLeftClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;
         
      // Use it
      if (typeof item.endLeftClick !== "undefined") item.endLeftClick(this.getEntity() as Warrior, this.inventory, this.selectedSlot);
   }

   public startRightClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;
         
      // Use it
      if (typeof item.startRightClick !== "undefined") item.startRightClick(this.getEntity() as Warrior, this.inventory, this.selectedSlot);
   }

   public endRightClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;

      this.isUsingItem = false;
         
      // Use it
      if (typeof item.endRightClick !== "undefined") item.endRightClick(this.getEntity() as Warrior, this.inventory, this.selectedSlot);
   }
}

export default SelectedSlotComponent;