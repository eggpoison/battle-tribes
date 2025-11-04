import { Inventory, InventoryName, ItemType } from "battletribes-shared/items/items";
import ItemSlot, { ItemSlotCallbackInfo } from "./ItemSlot";
import { useRef } from "react";
import { ItemRestTime } from "../GameInteractableLayer";

interface InventoryProps {
   readonly entityID?: number;
   /** If null, the container will default to an empty inventory the size of the last inputted inventory. Cannot have an initial value of null. */
   readonly inventory: Inventory;
   readonly className?: string;
   itemSlotClassNameCallback?(callbackInfo: ItemSlotCallbackInfo): string | undefined;
   readonly selectedItemSlot?: number;
   readonly isBordered?: boolean;
   readonly isManipulable?: boolean;
   readonly itemRestTimes?: ReadonlyArray<ItemRestTime>;
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

const getItemSlotType = (inventory: Inventory | null, itemSlot: number): ItemType | null => {
   if (inventory === null) {
      return null;
   }

   const item = inventory.getItem(itemSlot);
   if (item === null) {
      return null;
   }
   return item.type;
}

const InventoryContainer = ({ entityID, inventory, className, itemSlotClassNameCallback, selectedItemSlot, isBordered, isManipulable = true, itemRestTimes, onMouseDown, onMouseOver, onMouseOut, onMouseMove }: InventoryProps) => {
   // @Hack
   const placeholderImgRef = useRef<any | undefined>();
   
   placeholderImgRef.current = getPlaceholderImg(inventory);
   
   const itemSlots = new Array<JSX.Element>();

   for (let y = 0; y < inventory.height; y++) {
      const rowItemSlots = new Array<JSX.Element>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlotIdx = y * inventory.width + x;
         const itemSlot = itemSlotIdx + 1;

         const callbackInfo: ItemSlotCallbackInfo = {
            itemType: getItemSlotType(inventory, itemSlot),
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
            <ItemSlot key={x} className={className} entityID={entityID} inventory={inventory} itemSlot={itemSlot} isManipulable={isManipulable} isSelected={isSelected} placeholderImg={placeholderImgRef.current} restTime={typeof itemRestTimes !== "undefined" ? itemRestTimes[itemSlotIdx] : undefined} onMouseDown={leftClickFunc} onMouseOver={onMouseOver} onMouseOut={onMouseOut} onMouseMove={onMouseMove} />
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