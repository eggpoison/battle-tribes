import { Inventory, ItemType } from "battletribes-shared/items/items";
import { onItemSlotMouseDown } from "../../../inventory-manipulation";
import { getItemTypeImage } from "../../../client-item-info";

export interface ItemSlotCallbackInfo {
   readonly itemSlot: number;
   readonly itemType: ItemType | null;
}

export interface ItemSlotProps {
   readonly entityID?: number;
   readonly inventory: Inventory | null;
   readonly itemSlot: number;
   // readonly picturedItemImageSrc?: any;
   readonly isSelected?: boolean;
   // readonly itemCount?: number;
   readonly className?: string;
   /** Determines whether or not items can be added and removed freely. */
   readonly isManipulable?: boolean;
   readonly placeholderImg?: any;
   onMouseDown?(e: MouseEvent): void;
   onMouseOver?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
   onMouseOut?: () => void;
   onMouseMove?: (e: MouseEvent) => void;
   onContextMenu?: (e: MouseEvent) => void;
   /** If defined, determines whether or not a given item type is able to be put in the slot (doesn't affect taking out items) */
   validItemSpecifier?(itemType: ItemType): boolean;
}

const ItemSlot = (props: ItemSlotProps) => {
   const isManipulable = typeof props.isManipulable === "undefined" || props.isManipulable;

   const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      if (isManipulable && props.inventory !== null && typeof props.entityID !== "undefined") {
         onItemSlotMouseDown(e.nativeEvent, props.entityID, props.inventory, props.itemSlot);
      }

      if (typeof props.onMouseDown !== "undefined") {
         props.onMouseDown(e.nativeEvent);
      }
   }

   const item = props.inventory?.itemSlots[props.itemSlot];

   const callbackInfo: ItemSlotCallbackInfo = {
      itemSlot: props.itemSlot,
      itemType: typeof item !== "undefined" ? item.type : null,
   };
   
   const img = typeof item !== "undefined" ? getItemTypeImage(item.type) : props.placeholderImg;
   
   return <div onContextMenu={typeof props.onContextMenu !== "undefined" ? (e => props.onContextMenu!(e.nativeEvent)) : undefined}
   onMouseOver={typeof props.onMouseOver !== "undefined" ? e => props.onMouseOver!(e.nativeEvent, callbackInfo) : undefined}
   onMouseOut={props.onMouseOut}
   onMouseMove={typeof props.onMouseMove !== "undefined" ? e => props.onMouseMove!(e.nativeEvent) : undefined}
   className={`item-slot${typeof props.className !== "undefined" ? " " + props.className : ""}${props.isSelected ? " selected" : ""}${typeof item === "undefined" ? " empty" : ""}`}
   onMouseDown={onMouseDown}>
      {typeof img !== "undefined" ? (
         <img src={img} draggable={false} alt="" />
      ) : null}
      {typeof item !== "undefined" ? (
         <div className="item-count">{item.count !== 1 ? item.count : ""}</div>
      ) : null}
   </div>;
}

export default ItemSlot;