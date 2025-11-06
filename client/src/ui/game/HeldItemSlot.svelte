<script lang="ts">
   import { getItemTypeImage } from "../../game/client-item-info";
   import { inventoryState } from "../../ui-state/inventory-state.svelte";

   let props = $props();
   
   const heldItem = inventoryState.heldItemSlot.getItem(1);
</script>

{#if heldItem !== null}
   <div id="held-item" style:left="{props.mouseX}px" style:top="{props.mouseY}px">
      <img class="held-item-icon" src={getItemTypeImage(heldItem.type)} alt="" />
      <div class="held-item-count">{heldItem.count > 1 ? heldItem.count : ""}</div>
   </div>
{/if}

<style>
   #held-item {
      width: var(--item-slot-size);
      height: var(--item-slot-size);
      position: absolute;
      pointer-events: none;
      z-index: 3;
      user-select: none;
   }
   #held-item img {
      width: var(--item-image-size);
      height: var(--item-image-size);
      image-rendering: pixelated;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1;
   }
</style>