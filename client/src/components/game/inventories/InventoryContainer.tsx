import { Inventory, ItemType } from "webgl-test-shared/dist/items";
import { getItemTypeImage } from "../../../client-item-info";
import { leftClickItemSlot, rightClickItemSlot } from "../../../inventory-manipulation";
import ItemSlot from "./ItemSlot";

export interface ItemSlotLeftClickCallbackInfo {
   readonly itemType: ItemType | null;
}

interface InventoryProps {
   readonly entityID: number;
   readonly inventory: Inventory;
   readonly className?: string;
   readonly selectedItemSlot?: number;
   readonly isBordered?: boolean;
   /** If defined, calls this function instead of the leftClickItemSlot function */
   onLeftClick?(e: MouseEvent, callbackInfo: ItemSlotLeftClickCallbackInfo): void;
}

const InventoryContainer = ({ entityID, inventory, className, selectedItemSlot, isBordered, onLeftClick }: InventoryProps) => {
   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < inventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlot = y * inventory.width + x + 1;
         const item = inventory.itemSlots[itemSlot];

         let leftClickFunc: (e: MouseEvent) => void;
         if (typeof onLeftClick !== "undefined") {
            const callbackInfo: ItemSlotLeftClickCallbackInfo = {
               itemType: typeof item !== "undefined" ? item.type : null
            };
            leftClickFunc = (e: MouseEvent) => onLeftClick(e, callbackInfo);
         } else {
            leftClickFunc = (e: MouseEvent) => leftClickItemSlot(e, entityID, inventory, itemSlot);
         }

         const isSelected = typeof selectedItemSlot !== "undefined" && itemSlot=== selectedItemSlot;
         if (typeof item !== "undefined") {
            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickFunc(e)} onContextMenu={e => rightClickItemSlot(e, entityID, inventory, itemSlot)} picturedItemImageSrc={getItemTypeImage(item.type)} itemCount={item.count} isSelected={isSelected} />
            );
         } else {
            rowItemSlots.push(
               <ItemSlot key={x} onClick={e => leftClickFunc(e)} onContextMenu={e => rightClickItemSlot(e, entityID, inventory, itemSlot)} isSelected={isSelected} />
            );
         }
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
   if (isBordered) {
      resultingClassName += " bordered";
   }

   return <div className={resultingClassName}>
      {itemSlots}
   </div>;
}

export default InventoryContainer;