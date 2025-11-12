<script lang="ts">
   import { type Snippet } from "svelte";
   import type { HTMLAttributes } from "svelte/elements";
   import ItemSlot from "./ItemSlot.svelte";

   // @Cleanup: would it be worth reverting to the system where i pass in an inventory, bypassing all of the unfortunateness happening here?? i mean the main issue with that and why i went for this silly system is that i thought it would be too rigid - but what if I don't collapse up the itemSlots logic? and just pass in the inventory here anywhays?
   
   interface BaseProps extends HTMLAttributes<HTMLDivElement> {
      children: Snippet<[]>;
      className?: string;
      isBordered?: boolean;
      // Have yet to encounter a scenario which needs an unset width
      width: number;
      // @Cleanup unfortunate but the number of children cannot be determined here; the item count must be supplied instead.
      numItemSlotsPassed: number;
   }

   interface PropsWithHeightSet extends BaseProps {
      height: number;
   }

   interface PropsWithHeightUnset extends BaseProps {
      // @Cleanup another shittery with Svelte that this has to be done, and ALSO DEFINED IN EVERY INSTANCE OF THIS ELEMENT. basically has to signal that the props are infact PropsWithHeightUnset
      height: undefined;
      minHeight?: number;
   }

   type Props = PropsWithHeightSet | PropsWithHeightUnset;

   let { class: className, ...props }: Props = $props();

   const getInventoryHeight = (): number => {
      // If the height is explicitly set just use that
      if (typeof props.height !== "undefined") {
         return props.height;
      }

      // If the width isn't set, assume all the items are just wanted in one row.
      const width = props.width;
      if (typeof width === "undefined") {
         return 1;
      }

      // First, find the minimum number of rows that could support the supplied items with its width
      let minHeight = Math.ceil((props as PropsWithHeightUnset).numItemSlotsPassed / width);

      if (typeof props.minHeight !== "undefined" && props.minHeight > minHeight) {
         minHeight = props.minHeight;
      }

      return minHeight;
   }

   const height = $derived(getInventoryHeight());

   const getEmptyItemSlotsArray = (): Array<void> => {
      const width = props.width;

      const numMissingSlots = width * height - props.numItemSlotsPassed;
      const uselessArray = new Array<void>();
      for (let i = 0; i < numMissingSlots; i++) {
         uselessArray.push(0 as unknown as void);
      }
      return uselessArray;
   }
</script>

<div
   class="item-slots-container{typeof className !== "undefined" ? " " + className : ""}"
   class:bordered={props.isBordered}
   class:set-width={typeof props.width !== "undefined"}
   style:--width-items={props.width}
   style:--height-items={height}
   {...props}
>
   {@render props.children?.()}

   {#each getEmptyItemSlotsArray()}
      <ItemSlot item={null} />
   {/each}
</div>