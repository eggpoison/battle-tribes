<script lang="ts">
   import { nerdVisionState } from "../../../ui-state/nerd-vision-state.svelte";
   import GameInfoDisplay from "./DebugDisplay.svelte";
   import HoverDebugDisplay from "./HoverDebugDisplay.svelte";
   import TabSelector from "./TabSelector.svelte";
   import Terminal from "./Terminal.svelte";
</script>

{#if nerdVisionState.isVisible}
   <div id="nerd-vision-wrapper">
      <GameInfoDisplay />
      <HoverDebugDisplay />
      <!-- <TerminalButton startingIsOpened={terminalStartingVisibility} /> -->
       {#if nerdVisionState.terminalIsVisible}
         <Terminal/>
      {/if}

      <TabSelector />
   </div>
{/if}