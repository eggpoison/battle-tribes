import Component from "../Component";
import FoodItem from "../items/FoodItem";
import Item from "../items/Item";
import ITEMS, { ItemName } from "../items/items";
import SETTINGS from "../settings";
import FiniteInventoryComponent from "./inventory/FiniteInventoryComponent";

class SelectedSlotComponent extends Component {
   private selectedSlot: number = 0;

   private foodEatCooldown: number = 0;

   private inventory!: FiniteInventoryComponent;

   private isUsingItem: boolean = false;

   onLoad(): void {
      this.inventory = this.getEntity().getComponent(FiniteInventoryComponent)!;
   }

   public tick(): void {
      if (this.isUsingItem) {
         const item = this.getSelectedItem();
         if (item === null) return;
         
         // Don't use food if on cooldown
         if (item instanceof FoodItem) {
            this.foodEatCooldown -= 1 / SETTINGS.tps;
            if (this.foodEatCooldown > 0) return;
         }
         
         // Use the current item
         if (typeof item.duringRightClick !== "undefined") item.duringRightClick(this.getEntity(), this.inventory, this.selectedSlot);
      }
   }

   public changeSlot(newSlot: number): void {
      this.selectedSlot = newSlot;
   }

   public getSlot(): number {
      return this.selectedSlot;
   }

   public getSelectedItemName(): ItemName | null {
      const itemSlot = this.inventory.getSlot(this.selectedSlot)
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
      if (typeof item.startLeftClick !== "undefined") item.startLeftClick(this.getEntity(), this.inventory, this.selectedSlot);
   }

   public endLeftClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;
         
      // Use it
      if (typeof item.endLeftClick !== "undefined") item.endLeftClick(this.getEntity(), this.inventory, this.selectedSlot);
   }

   public startRightClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;

      // if (item instanceof FoodItem) {
      //    if (this.foodEatCooldown > 0) return;
         
      //    this.foodEatCooldown = FoodItem.COOLDOWN;
      // }

      this.isUsingItem = true;
         
      // Use it
      if (typeof item.startRightClick !== "undefined") item.startRightClick(this.getEntity(), this.inventory, this.selectedSlot);
   }

   public endRightClick(): void {
      const item = this.getSelectedItem();
      if (item === null) return;

      this.isUsingItem = false;
         
      // Use it
      if (typeof item.endRightClick !== "undefined") item.endRightClick(this.getEntity(), this.inventory, this.selectedSlot);
   }
}

export default SelectedSlotComponent;