import Component from "../Component";
import ITEMS, { ItemName } from "../items/items";
import FiniteInventoryComponent from "./inventory/FiniteInventoryComponent";

class SelectedSlotComponent extends Component {
   private selectedSlot: number = 0;

   private inventory!: FiniteInventoryComponent;

   onLoad(): void {
      this.inventory = this.getEntity().getComponent(FiniteInventoryComponent)!;
   }

   public changeSlot(newSlot: number): void {
      this.selectedSlot = newSlot;
   }

   public getSlot(): number {
      return this.selectedSlot;
   }

   public useItem(): void {
      // Get the item
      const itemName = this.inventory.getItemSlots()[this.selectedSlot][1];
      const item = ITEMS[itemName as ItemName];

      // Use it
      item.use(this.getEntity());
   }
}

export default SelectedSlotComponent;