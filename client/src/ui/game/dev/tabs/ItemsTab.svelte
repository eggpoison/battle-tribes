<script lang="ts">
   import { sendDevGiveItemPacket } from "../../../../game/networking/packet-sending";
   import { getItemStackSize, ItemType } from "webgl-test-shared";
   import ItemCatalogue from "./ItemCatalogue.svelte";

   const onSlotClick = (e: MouseEvent, itemType: ItemType): void => {
      const amount = e.shiftKey ? getItemStackSize(itemType) : 1;
      sendDevGiveItemPacket(itemType, amount);
   }
</script>

<ItemCatalogue onmousedown={onSlotClick} />