<script lang="ts">
   import { nerdVisionState } from "../../../ui-state/nerd-vision-state.svelte";
   import GameInfoDisplay from "./DebugDisplay.svelte";
   import HoverDebugDisplay from "./HoverDebugDisplay.svelte";
</script>

{#if nerdVisionState.isVisible}
   <div id="nerd-vision-wrapper">
      <GameInfoDisplay />
      <HoverDebugDisplay />
      <!-- <TerminalButton startingIsOpened={terminalStartingVisibility} /> -->
      <Terminal/>

      <TabSelector summonPacketRef={props.summonPacketRef} />
   </div>
{/if}