<script lang="ts">
   import { sendDevGiveItemPacket } from "../../../../game/networking/packet-sending";
   import { getItemStackSize } from "webgl-test-shared";
   import { ItemSlotCallbackInfo } from "../../inventories/ItemSlot.svelte";
   import ItemCatalogue from "./ItemCatalogue.svelte";

   const onSlotClick = (e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void => {
      if (callbackInfo.itemType === null) {
         return;
      }
      
      const amount = e.shiftKey ? getItemStackSize(callbackInfo.itemType) : 1;
      sendDevGiveItemPacket(callbackInfo.itemType, amount);
   }
</script>

<ItemCatalogue onMouseDown={onSlotClick} />