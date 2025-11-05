<script lang="ts">
   import { getCurrentLayer } from "../../../game/world";
   import { cursorWorldPos } from "../../../game/mouse-input";
   import { hoverDebugState } from "../../../ui-state/hover-debug-state.svelte";
   import HoverDebugTile from "./tabs/HoverDebugTile.svelte";
   import HoverDebugEntity from "./HoverDebugEntity.svelte";

   const layer = getCurrentLayer();
</script>

<div id="debug-info">
   <p>Looking at pos <span class="highlight">{cursorWorldPos.x.toFixed(0)}</span> <span class="highlight">{cursorWorldPos.y.toFixed(0)}</span></p>
   
   {#if hoverDebugState.tile !== null}
      <HoverDebugTile {layer} tile={hoverDebugState.tile} />
   {/if}
   {#if hoverDebugState.entityDebugData !== null}
      <HoverDebugEntity entityDebugData={hoverDebugState.entityDebugData} />
   {/if}
</div>