<script lang="ts">
   import { type Entity } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../../game/client-entity-info";
   import { type ExtendedTribe } from "../../../../game/tribes";
   import { tribePlanVisualiserState } from "../../../../ui-state/tribe-plan-visualiser-state.svelte";

   interface Props {
      readonly tribe: ExtendedTribe;
   }

   let props: Props = $props();

   const onchange = (e: Event): void => {
      const selectedValue = Number((e.target! as HTMLSelectElement).value) as Entity;
      tribePlanVisualiserState.setEntity(selectedValue !== 0 ? selectedValue : null);
   }
</script>
   
<div class="dropdown" {onchange}>
   <select>
      <option value={0}>None</option>
      {#each props.tribe.tribesmen as tribesman}
         <option value={tribesman.entity}>{tribesman.name}, {CLIENT_ENTITY_INFO_RECORD[tribesman.entityType].name}</option>
      {/each}
   </select>
</div>