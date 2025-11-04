<script lang="ts">
   import { onKeyDown, onKeyUp } from "../game/keyboard-input";
   import { AppState, appState } from "../stores/app-state.svelte";
   import FrameGraph from "./game/dev/FrameGraph.svelte";
   import GameScreen from "./game/GameScreen.svelte";
   import LoadingScreen from "./LoadingScreen.svelte";
   import MainMenu from "./MainMenu.svelte";
   import { createPlayerInputListeners } from "./game/GameInteractableLayer";
</script>

<svelte:window
   on:load={createPlayerInputListeners}
   on:keydown={onKeyDown}
   on:keyup={onKeyUp}
/>

{#if appState === AppState.mainMenu}
   <MainMenu />
{:else if appState === AppState.loading}
   <LoadingScreen />
{:else if appState === AppState.game}
   <GameScreen />
{/if}

<div id="canvas-wrapper" class={appState !== AppState.game ? "hidden" : undefined}>
   <canvas id="game-canvas"></canvas>
   <canvas id="text-canvas"></canvas>
   <canvas id="tech-tree-canvas" class="hidden"></canvas>
   <canvas id="tribe-plan-visualiser-canvas" class="hidden"></canvas>
   <FrameGraph />
</div>

<style>
   #text-canvas {
      pointer-events: none;
   }
</style>