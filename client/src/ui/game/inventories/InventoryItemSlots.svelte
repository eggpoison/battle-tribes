<script lang="ts">
   import { assert, type Entity, type Inventory } from "webgl-test-shared";
   import EntityInteractableItemSlot, { type ItemSlotCallbackInfo } from "./EntityInteractableItemSlot";
   import ItemSlotsRow from "./ItemSlotsRow.svelte";
    import { entityExists } from "../../../game/world";

   interface Props {
      readonly entity: Entity;
      readonly inventory: Inventory;
      onmousedown?(e: MouseEvent, callbackInfo: ItemSlotCallbackInfo): void;
   }

   const { entity, inventory }: Props = $props();

   // This component should only be used for actual entities.
   assert(entityExists(entity));

   const getInventoryRowNums = (): Array<number> => {
      const rowNums = new Array<number>();
      for (let y = 0; y < inventory.height; y++) {
         rowNums.push(y);
      }
      return rowNums;
   }

   const getRowSlots = (y: number): Array<number> => {
      const itemSlots = new Array<number>();
      for (let x = 0; x < inventory.width; x++) {
         const itemSlotIdx = y * inventory.width + x;
         const itemSlot = itemSlotIdx + 1;
         itemSlots.push(itemSlot);
      }
      return itemSlots;
   }
</script>

{#each getInventoryRowNums() as y}
   <ItemSlotsRow>
      {#each getRowSlots(y) as itemSlot}
      <!-- @Cleanup: unused?? -->
         {@const callbackInfo: ItemSlotCallbackInfo = {
            itemType: inventory.getItem(itemSlot)?.type || null,
            itemSlot: itemSlot
         }}

         <EntityInteractableItemSlot entity={entity} inventory={inventory} itemSlot={itemSlot} />
      {/each}
   </ItemSlotsRow>
{/each}