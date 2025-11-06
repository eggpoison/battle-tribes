<script lang="ts">
   import { type Inventory, ItemType } from "webgl-test-shared";
   import { onItemSlotMouseDown } from "../../../game/inventory-manipulation";
   import { getItemTypeImage } from "../../../game/client-item-info";
   import { type ItemRestTime } from "../../../game/player-action-handler";
   import ItemTooltip from "./ItemTooltip.svelte";

   export interface ItemSlotCallbackInfo {
      readonly itemSlot: number;
      readonly itemType: ItemType | null;
   }

   interface Props {
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

   let props: Props = $props();

   const isManipulable = typeof props.isManipulable === "undefined" || props.isManipulable;
   const item = props.inventory?.itemSlots[props.itemSlot];

   let isHovering = $state(false);
   let hoverX = $state(0);
   let hoverY = $state(0);

   const onmousedown = (e: MouseEvent): void => {
      if (isManipulable && props.inventory !== null && typeof props.entityID !== "undefined") {
         onItemSlotMouseDown(e, props.entityID, props.inventory, props.itemSlot);
      }

      if (typeof props.onMouseDown !== "undefined") {
         props.onMouseDown(e);
      }
   }

   const onmouseover = (e: MouseEvent): void => {
      isHovering = true;
      hoverX = e.clientX;
      hoverY = e.clientY;

      if (typeof props.onMouseOver !== "undefined") {
         props.onMouseOver(e, callbackInfo);
      }
   }

   const onmouseout = (e: MouseEvent): void => {
      isHovering = false;

      if (typeof props.onMouseOver !== "undefined") {
         props.onMouseOver(e, callbackInfo);
      }
   }

   const onmousemove = (e: MouseEvent): void => {
      isHovering = true;
      hoverX = e.clientX;
      hoverY = e.clientY;

      if (typeof props.onMouseMove !== "undefined") {
         props.onMouseMove(e);
      }
   }

   const callbackInfo: ItemSlotCallbackInfo = {
      itemSlot: props.itemSlot,
      itemType: typeof item !== "undefined" ? item.type : null,
   };
   
   const img = typeof item !== "undefined" ? getItemTypeImage(item.type) : props.placeholderImg;
   
</script>


<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_mouse_events_have_key_events -->
<div oncontextmenu={props.onContextMenu}
   {onmouseover}
   {onmouseout}
   {onmousemove}
   {onmousedown}
   class="item-slot {props.className}"
   class:selected={props.isSelected}
   class:empty={typeof item === "undefined"}
>
   {#if typeof img !== "undefined"}
      <img src={img} draggable={false} alt="" />
   {/if}
   {#if typeof item !== "undefined"}
      <div class="item-count">{item.count !== 1 ? item.count : ""}</div>
   {/if}
   {#if (typeof props.restTime !== "undefined" && props.restTime.durationTicks > 0)}
      <div class="cooldown-bg" style:--cooldown="{props.restTime.remainingTimeTicks / props.restTime.durationTicks}"></div>
   {/if}
</div>

{#if typeof item !== "undefined" && isHovering}
   <ItemTooltip {item} x={hoverX} y={hoverY} />
{/if}