<script lang="ts">
   import { entityExists, getCurrentLayer } from "../../../game/world";
   import { hoverDebugState } from "../../../ui-state/hover-debug-state";
   import HoverDebugTile from "./tabs/HoverDebugTile.svelte";
   import HoverDebugEntity from "./HoverDebugEntity.svelte";
   import { cursorWorldPos } from "../../../game/camera";

   const layer = getCurrentLayer();

   const entityDebugData = $derived(hoverDebugState.entityDebugData);
</script>

<div id="debug-info">
   <p>Looking at pos <span class="highlight">{cursorWorldPos.x.toFixed(0)}</span> <span class="highlight">{cursorWorldPos.y.toFixed(0)}</span></p>
   
   {#if hoverDebugState.tile !== null}
      <HoverDebugTile {layer} tile={hoverDebugState.tile} />
   {/if}
   {#if entityDebugData !== null && entityExists(entityDebugData.entityID)}
      <HoverDebugEntity {entityDebugData} />
   {/if}
</div>