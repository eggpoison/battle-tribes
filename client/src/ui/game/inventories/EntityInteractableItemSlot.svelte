<script lang="ts">
   import { type Entity, type Inventory, ItemType } from "webgl-test-shared";
   import { onItemSlotMouseDown } from "../../../game/inventory-manipulation";
   import { type ItemRestTime } from "../../../game/player-action-handler";
   import ItemSlot from "./ItemSlot.svelte";

   export interface ItemSlotCallbackInfo {
      readonly itemSlot: number;
      readonly itemType: ItemType | null;
   }

   export interface Props {
      readonly entity: Entity;
      readonly inventory: Inventory;
      readonly itemSlot: number;
      // readonly picturedItemImageSrc?: any;
      readonly isSelected?: boolean;
      readonly className?: string;
      /** Determines whether or not items can be added and removed freely. */
      readonly isManipulable?: boolean;
      readonly placeholderImg?: any;
      readonly restTime?: ItemRestTime;
      onmousedown?(e: MouseEvent): void;
      onmouseover?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
      onmouseout?: () => void;
      onmousemove?: (e: MouseEvent) => void;
      onoontextmenu?: (e: MouseEvent) => void;
      /** If defined, determines whether or not a given item type is able to be put in the slot (doesn't affect taking out items) */
      validItemSpecifier?(itemType: ItemType): boolean;
   }

   let props: Props = $props();

   const item = $derived(props.inventory.getItem(props.itemSlot));

   const isManipulable = typeof props.isManipulable === "undefined" || props.isManipulable;

   const onmousedown = (e: MouseEvent): void => {
      if (isManipulable && props.inventory !== null && typeof props.entity !== "undefined") {
         onItemSlotMouseDown(e, props.entity, props.inventory, props.itemSlot);
      }
   }

   const getCallbackInfo = (): ItemSlotCallbackInfo => {
      return {
         itemSlot: props.itemSlot,
         itemType: item !== null ? item.type : null,
      };
   }

   const onmouseover = (e: MouseEvent): void => {
      if (typeof props.onmouseover !== "undefined") {
         props.onmouseover(e, getCallbackInfo());
      }
   }

   const onmouseout = (e: MouseEvent): void => {
      if (typeof props.onmouseover !== "undefined") {
         props.onmouseover(e, getCallbackInfo());
      }
   }

   const onmousemove = (e: MouseEvent): void => {
      if (typeof props.onmousemove !== "undefined") {
         props.onmousemove(e);
      }
   }
</script>

<ItemSlot
   {item}
   class="{props.className}{props.isSelected ? " selected" : ""}{item === null ? " empty" : ""}"
   {onmousedown}
   {onmouseover}
   {onmouseout}
   {onmousemove}
/>