import { Inventory, InventoryName } from "battletribes-shared/items/items";
import ItemSlot, { ItemSlotCallbackInfo } from "./ItemSlot";
import { useRef } from "react";

interface InventoryProps {
   readonly entityID?: number;
   /** If null, the container will default to an empty inventory the size of the last inputted inventory. Cannot have an initial value of null. */
   readonly inventory: Inventory | null;
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

const getPlaceholderImg = (inventory: Inventory): any | undefined => {
   switch (inventory.name) {
      case InventoryName.backpackSlot: {
         return require("../../../images/miscellaneous/backpack-wireframe.png");
      }
      case InventoryName.armourSlot: {
         return require("../../../images/miscellaneous/armour-wireframe.png");
      }
      case InventoryName.gloveSlot: {
         return require("../../../images/miscellaneous/glove-wireframe.png");
      }
   }
}

const InventoryContainer = ({ entityID, inventory, className, itemSlotClassNameCallback, selectedItemSlot, isBordered, isManipulable = true, onMouseDown, onMouseOver, onMouseOut, onMouseMove }: InventoryProps) => {
   const inventoryWidthRef = useRef<number | null>(null);
   const inventoryHeightRef = useRef<number | null>(null);
   // @Hack
   const placeholderImgRef = useRef<any | undefined>();
   
   if (inventory === null && (inventoryWidthRef.current === null || inventoryHeightRef.current === null)) {
      throw new Error("Initial value of inventory cannot be null.");
   }

   if (inventory !== null) {
      inventoryWidthRef.current = inventory.width;
      inventoryHeightRef.current = inventory.height;
      placeholderImgRef.current = getPlaceholderImg(inventory);
   }
   const width = inventoryWidthRef.current!;
   const height = inventoryHeightRef.current!;
   
   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < width; x++) {
         const itemSlot = y * width + x + 1;

         // let callbackInfo: 
         const callbackInfo: ItemSlotCallbackInfo = {
            itemType: inventory?.getItem(itemSlot)?.type || null,
            itemSlot: itemSlot
         };

         let leftClickFunc: ((e: MouseEvent) => void) | undefined;
         if (inventory !== null) {
            if (typeof onMouseDown !== "undefined") {
               leftClickFunc = (e: MouseEvent) => onMouseDown(e, callbackInfo);
            }
         }

         let className: string | undefined;
         if (typeof itemSlotClassNameCallback !== "undefined") {
            className = itemSlotClassNameCallback(callbackInfo);
         }

         const isSelected = typeof selectedItemSlot !== "undefined" && itemSlot === selectedItemSlot;
         rowItemSlots.push(
            <ItemSlot key={x} className={className} entityID={entityID} inventory={inventory} itemSlot={itemSlot} isManipulable={isManipulable} isSelected={isSelected} placeholderImg={placeholderImgRef.current} onMouseDown={leftClickFunc} onMouseOver={onMouseOver} onMouseOut={onMouseOut} onMouseMove={onMouseMove} />
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