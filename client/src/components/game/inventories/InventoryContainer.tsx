import { Inventory } from "webgl-test-shared/dist/items/items";
import ItemSlot, { ItemSlotCallbackInfo } from "./ItemSlot";

interface InventoryProps {
   readonly entityID: number;
   readonly inventory: Inventory;
   readonly className?: string;
   itemSlotClassNameCallback?(callbackInfo: ItemSlotCallbackInfo): string | undefined;
   readonly selectedItemSlot?: number;
   readonly isBordered?: boolean;
   readonly isManipulable?: boolean;
   onMouseDown?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
   onMouseOver?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
   onMouseMove?: (e: MouseEvent) => void;
   onMouseOut?(): void;
}

const InventoryContainer = ({ entityID, inventory, className, itemSlotClassNameCallback, selectedItemSlot, isBordered, isManipulable = true, onMouseDown, onMouseOver, onMouseOut, onMouseMove }: InventoryProps) => {
   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < inventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlot = y * inventory.width + x + 1;
         const item = inventory.itemSlots[itemSlot];

         const callbackInfo: ItemSlotCallbackInfo = {
            itemType: typeof item !== "undefined" ? item.type : null,
            itemSlot: itemSlot
         };

         let leftClickFunc: ((e: MouseEvent) => void) | undefined;
         if (typeof onMouseDown !== "undefined") {
            leftClickFunc = (e: MouseEvent) => onMouseDown(e, callbackInfo);
         }

         let className: string | undefined;
         if (typeof itemSlotClassNameCallback !== "undefined") {
            className = itemSlotClassNameCallback(callbackInfo);
         }

         const isSelected = typeof selectedItemSlot !== "undefined" && itemSlot === selectedItemSlot;
         rowItemSlots.push(
            <ItemSlot key={x} className={className} entityID={entityID} inventory={inventory} itemSlot={itemSlot} isManipulable={isManipulable} isSelected={isSelected} onMouseDown={leftClickFunc} onMouseOver={onMouseOver} onMouseOut={onMouseOut} onMouseMove={onMouseMove} />
         );
      }
      
      itemSlots.push(
         <div key={y} className="inventory-row">
            {rowItemSlots}
         </div>
      );
   }

   let resultingClassName = "inventory-container";
   if (typeof className !== "undefined") {
      resultingClassName += " " + className;
   }
   // @Cleanup: Is this used?
   if (isBordered) {
      resultingClassName += " bordered";
   }

   return <div className={resultingClassName}>
      {itemSlots}
   </div>;
}

export default InventoryContainer;