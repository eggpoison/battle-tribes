import { Inventory, ItemType } from "battletribes-shared/items/items";
import { onItemSlotMouseDown } from "../../../game/inventory-manipulation";
import { getItemTypeImage } from "../../../game/client-item-info";
import { ItemRestTime } from "../GameInteractableLayer";
import { ItemTooltip_hide, ItemTooltip_setItem, ItemTooltip_setPos } from "./ItemTooltip";
import { useEffect } from "react";

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
   readonly restTime?: ItemRestTime;
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
   const item = props.inventory?.itemSlots[props.itemSlot];

   useEffect(() => {
      return () => {
         ItemTooltip_hide();
      }
   }, []);
   
   const onMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
      if (isManipulable && props.inventory !== null && typeof props.entityID !== "undefined") {
         onItemSlotMouseDown(e.nativeEvent, props.entityID, props.inventory, props.itemSlot);
      }

      if (typeof props.onMouseDown !== "undefined") {
         props.onMouseDown(e.nativeEvent);
      }
   }

   const onMouseOver = (e: MouseEvent): void => {
      ItemTooltip_setItem(item || null)
      ItemTooltip_setPos(e.clientX, e.clientY);

      if (typeof props.onMouseOver !== "undefined") {
         props.onMouseOver(e, callbackInfo);
      }
   }

   const onMouseOut = (e: MouseEvent): void => {
      ItemTooltip_setItem(null)

      if (typeof props.onMouseOver !== "undefined") {
         props.onMouseOver(e, callbackInfo);
      }
   }

   const onMouseMove = (e: MouseEvent): void => {
      ItemTooltip_setItem(item || null);
      ItemTooltip_setPos(e.clientX, e.clientY);

      if (typeof props.onMouseMove !== "undefined") {
         props.onMouseMove(e);
      }
   }

   const callbackInfo: ItemSlotCallbackInfo = {
      itemSlot: props.itemSlot,
      itemType: typeof item !== "undefined" ? item.type : null,
   };
   
   const img = typeof item !== "undefined" ? getItemTypeImage(item.type) : props.placeholderImg;
   
   return <div onContextMenu={typeof props.onContextMenu !== "undefined" ? (e => props.onContextMenu!(e.nativeEvent)) : undefined}
   onMouseOver={e => onMouseOver(e.nativeEvent)}
   onMouseOut={e => onMouseOut(e.nativeEvent)}
   onMouseMove={e => onMouseMove(e.nativeEvent)}
   className={`item-slot${typeof props.className !== "undefined" ? " " + props.className : ""}${props.isSelected ? " selected" : ""}${typeof item === "undefined" ? " empty" : ""}`}
   onMouseDown={onMouseDown}>
      {typeof img !== "undefined" ? (
         <img src={img} draggable={false} alt="" />
      ) : null}
      {typeof item !== "undefined" ? (
         <div className="item-count">{item.count !== 1 ? item.count : ""}</div>
      ) : null}
      {(typeof props.restTime !== "undefined" && props.restTime.durationTicks > 0) ? (
         <div className="cooldown-bg" style={{"--cooldown": (props.restTime.remainingTimeTicks / props.restTime.durationTicks).toString()} as React.CSSProperties}></div>
      ) : null}
   </div>;
}

export default ItemSlot;