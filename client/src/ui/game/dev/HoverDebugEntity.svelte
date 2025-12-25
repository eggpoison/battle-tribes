<script lang="ts">
   import { TransformComponentArray } from "../../../game/entity-components/server-components/TransformComponent";
   import { InventoryNameString, roundNum, type EntityDebugData } from "webgl-test-shared";
   import { HealthComponentArray } from "../../../game/entity-components/server-components/HealthComponent";
   import { InventoryComponentArray } from "../../../game/entity-components/server-components/InventoryComponent";
   import { StructureComponentArray } from "../../../game/entity-components/server-components/StructureComponent";
   import { SnobeComponentArray } from "../../../game/entity-components/server-components/SnobeComponent";
   import { getHitboxVelocity } from "../../../game/hitboxes";
   import CLIENT_ENTITY_INFO_RECORD from "../../../game/client-entity-info";
   import { getEntityType } from "../../../game/world";
   import { hoverDebugState } from "../../../ui-state/hover-debug-state.svelte";
   import ItemSlotsContainer from "../inventories/ItemSlotsContainer.svelte";
   import InventoryItemSlots from "../inventories/InventoryItemSlots.svelte";
    import ItemSlot from "../inventories/ItemSlot.svelte";

   interface Props {
      entityDebugData: EntityDebugData;
   }

   let { entityDebugData }: Props = $props();
   const entity = $derived(entityDebugData.entityID);

   const transformComponent = $derived(TransformComponentArray.getComponent(entity));
   const hitbox = $derived(transformComponent.hitboxes[0]);

   const displayX = $derived(roundNum(hitbox.box.position.x, 0));
   const displayY = $derived(roundNum(hitbox.box.position.y, 0));

   const velocity = $derived(getHitboxVelocity(hitbox));
   const displayVelocityMagnitude = $derived(roundNum(velocity.magnitude(), 0));

   const debugData = hoverDebugState.entityDebugData;

   const healthComponent = $derived(HealthComponentArray.tryGetComponent(entity));
   const inventoryComponent = $derived(InventoryComponentArray.tryGetComponent(entity));
   const structureComponent = $derived(StructureComponentArray.tryGetComponent(entity));
   const snobeComponent = $derived(SnobeComponentArray.tryGetComponent(entity));
</script>


<div class="title">{CLIENT_ENTITY_INFO_RECORD[getEntityType(entity)].name}<span class="id">#{entity}</span></div>

<p>x: <span class="highlight">{displayX}</span>, y: <span class="highlight">{displayY}</span></p>

{#if typeof displayVelocityMagnitude !== "undefined"}
   <p>Velocity: <span class="highlight">{displayVelocityMagnitude}</span></p>
{/if}

<p>Angle: <span class="highlight">{hitbox.box.angle.toFixed(2)}</span></p>
<p>rAngle: <span class="highlight">{hitbox.box.relativeAngle.toFixed(2)}</span></p>
<p>Angular acceleration: <span class="highlight">{hitbox.angularAcceleration.toFixed(2)}</span></p>

<p>
   Chunks:
   {#each transformComponent.chunks as chunk, i}
      <span class="highlight">{chunk.x}-{chunk.y}</span>
      {#if i < transformComponent.chunks.size - 1}
         {", "} 
      {/if}
   {/each}
</p>

<p>Bounds: {transformComponent.boundingAreaMinX.toFixed(0)}, {transformComponent.boundingAreaMaxX.toFixed(0)}, {transformComponent.boundingAreaMinY.toFixed(0)}, {transformComponent.boundingAreaMaxY.toFixed(0)}</p>

{#if healthComponent !== null}
   <p>Health: <span class="highlight">{healthComponent.health}/{healthComponent.maxHealth}</span></p>
{/if}

{#if inventoryComponent !== null}
   {#each inventoryComponent.inventories as inventory}
      <div>
         <p>{InventoryNameString[inventory.name]}</p>
         <ItemSlotsContainer width={inventory.width} height={inventory.height} numItemSlotsPassed={inventory.items.length}>
            {#each inventory.items as item}
               <ItemSlot {item} />
            {/each}
         </ItemSlotsContainer>
         <br />
      </div>
   {/each}
{/if}

{#if structureComponent !== null}
   <p>Connected to:</p>
   <ul>
      {#each structureComponent.connections as connection}
         <li>{connection.entity}</li>
      {/each}
   </ul>
{/if}

{#if snobeComponent !== null}
   <p>Is digging:{snobeComponent.isDigging ? "true" : "false"}</p>
   <p>Digging progress:{snobeComponent.diggingProgress.toFixed(2)}</p>
{/if}

{#if debugData !== null}
   {#each debugData.debugEntries as str}
      <p>{str}</p>
   {/each}
{/if}

<br />