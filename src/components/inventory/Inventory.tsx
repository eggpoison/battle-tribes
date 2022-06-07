import InventoryComponent, { ItemSlots } from "../../entity-components/inventory/InventoryComponent";
import ItemSlot from "./ItemSlot";

interface InventoryProps {
   readonly itemSlots: ItemSlots;
   readonly slotCount: number;
   getInventoryComponent: () => InventoryComponent;
}

const Inventory = ({ itemSlots, slotCount, getInventoryComponent }: InventoryProps) => {
   const slotElements = new Array<JSX.Element>();
   for (let slotNum = 0; slotNum < slotCount; slotNum++) {
      const itemSlot = itemSlots[slotNum];
      if (typeof itemSlot === "undefined") {
         slotElements.push(
            <ItemSlot key={slotNum} slotNum={slotNum} getInventoryComponent={getInventoryComponent} />
         );
         continue;
      };

      const [itemName, amount] = itemSlot;

      slotElements.push(
         <ItemSlot key={slotNum} slotNum={slotNum} itemName={itemName} amount={amount} getInventoryComponent={getInventoryComponent} />
      );
   }

   return (
      <div className="inventory">
         {slotElements}
      </div>
   );
}

export default Inventory