<script lang="ts">
   import { type Entity, type Inventory } from "webgl-test-shared";
   import EntityInteractableItemSlot from "./EntityInteractableItemSlot.svelte";

   interface Props {
      readonly entity: Entity;
      readonly inventory: Inventory;
   }

   const { entity, inventory }: Props = $props();

</script>

{#each inventory.getSlots() as itemSlot}
   <EntityInteractableItemSlot entity={entity} inventory={inventory} itemSlot={itemSlot} />
{/each}