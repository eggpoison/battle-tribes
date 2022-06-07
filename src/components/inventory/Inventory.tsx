import InventoryComponent, { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import ItemSlot from "./ItemSlot";

interface InventoryProps {
   readonly itemSlots: ItemSlots;
   readonly slotCount: number;
   readonly selectedSlot?: number;
   getInventoryComponent: () => InventoryComponent;
}

const Inventory = ({ itemSlots, slotCount, selectedSlot, getInventoryComponent }: InventoryProps) => {
   const slotElements = new Array<JSX.Element>();
   for (let slotNum = 0; slotNum < slotCount; slotNum++) {
      const isSelected = typeof selectedSlot !== "undefined" && slotNum === selectedSlot;

      const itemSlot = itemSlots[slotNum];
      if (typeof itemSlot === "undefined") {
         slotElements.push(
            <ItemSlot key={slotNum} slotNum={slotNum} getInventoryComponent={getInventoryComponent} isSelected={isSelected} />
         );
         continue;
      };

      const [itemName, amount] = itemSlot;

      slotElements.push(
         <ItemSlot key={slotNum} slotNum={slotNum} itemName={itemName} amount={amount} getInventoryComponent={getInventoryComponent} isSelected={isSelected} />
      );
   }

   return (
      <div className="inventory">
         {slotElements}
      </div>
   );
}

export default Inventory