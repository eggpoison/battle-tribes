<script lang="ts">
   import { type Inventory } from "webgl-test-shared";
   import { type ItemSlotCallbackInfo } from "./ItemSlot.svelte";
   import { type ItemRestTime } from "../../../game/player-action-handler";
   import InventoryRow from "./InventoryRow.svelte";

   interface Props {
      readonly entityID?: number;
      /** If null, the container will default to an empty inventory the size of the last inputted inventory. Cannot have an initial value of null. */
      readonly inventory: Inventory;
      readonly className?: string;
      itemSlotClassNameCallback?(callbackInfo: ItemSlotCallbackInfo): string | undefined;
      readonly selectedItemSlot?: number;
      readonly isBordered?: boolean;
      readonly isManipulable?: boolean;
      readonly itemRestTime?: ItemRestTime;
      onMouseDown?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
      onMouseOver?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
      onMouseMove?: (e: MouseEvent) => void;
      onMouseOut?(): void;
   }

   let props: Props = $props();
   const inventory = props.inventory;

   const yPositions = new Array<number>();
   for (let y = 0; y < inventory.height; y++) {
      yPositions.push(y);
   }

   let resultingClassName = "inventory-container";
   if (typeof props.className !== "undefined") {
      resultingClassName += " " + props.className;
   }
   // @Cleanup: Is this used?
   if (props.isBordered) {
      resultingClassName += " bordered";
   }
</script>


<div class={resultingClassName}>
   {#each yPositions as y}
      <InventoryRow {...props} {y} />
   {/each}
</div>