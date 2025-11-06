<script lang="ts">
   import { Entity } from "webgl-test-shared";
   import CLIENT_ENTITY_INFO_RECORD from "../../../../game/client-entity-info";
   import { ExtendedTribe } from "../../../../game/tribes";

   interface Props {
      readonly tribe: ExtendedTribe;
      onSelectEntity(entity: Entity | null): void;
   }

   let props: Props = $props();

   const onchange = (e: Event): void => {
      const selectedValue = Number((e.target! as HTMLSelectElement).value) as Entity;
      props.onSelectEntity(selectedValue !== 0 ? selectedValue : null)
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