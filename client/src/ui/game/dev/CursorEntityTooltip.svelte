<script lang="ts">
   import { hoverDebugState } from "../../../ui-state/hover-debug-state.svelte";

   interface Props {
      mouseX: number;
      mouseY: number;
   }

   let props: Props = $props();
   
   const debugData = hoverDebugState.entityDebugData;
   
   const healthText = debugData !== null && typeof debugData.health !== "undefined" && typeof debugData.maxHealth !== "undefined" ? debugData.health.toFixed(2) + "/" + debugData.maxHealth.toFixed(2) : undefined;
</script>

{#if typeof healthText !== "undefined"}
   <div id="cursor-tooltip" style:bottom="{props.mouseX}px" style:left="{props.mouseY}px">
      <p>{healthText}</p>
   </div>
{/if}

<style>
   @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;700;900&display=swap');

   #cursor-tooltip {
      position: absolute;
      z-index: 1;
      transform: translate(-50%, 50%);
      user-select: none;
      pointer-events: none;
   }

   #cursor-tooltip p {
      color: #fff;
      font-family: "Inconsolata";
      font-weight: 700;
      font-size: 1.1rem;
      text-shadow: 2px 2px #000;
      background-color: rgba(0, 0, 0, 0.3);
      white-space: pre;
      margin: 0.3rem 0 0.3rem 50%;
      user-select: none;
      pointer-events: none;
      display: table;
      transform: translateX(-50%);
   }
</style>