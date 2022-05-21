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

      if (typeof this.changeSlotListener !== "undefined") this.changeSlotListener(this.selectedSlot);
   }

   public getSelectedSlot(): number {
      return this.selectedSlot;
   }

   public useItem(): void {
      const itemName = this.inventory.getItemSlots()[this.selectedSlot][1];

      const item = ITEMS[itemName as ItemName];
      item.use(this.getEntity());
   }

   private changeSlotListener?: (selectedSlot: number) => void;
   public addChangeSlotListener(func: (selectedSlot: number) => void): void {
      this.changeSlotListener = func;
   }
}

export default SelectedSlotComponent;