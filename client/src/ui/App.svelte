<script lang="ts">
   import { onKeyDown, onKeyUp } from "../game/keyboard-input";
   import { createPlayerInputListeners } from "../game/player-action-handler";
   import { AppState, appState } from "../ui-state/app-state.svelte";
   import { techTreeState } from "../ui-state/tech-tree-state.svelte";
   import FrameGraph from "./game/dev/FrameGraph.svelte";
   import GameScreen from "./game/GameScreen.svelte";
   import LoadingScreen from "./LoadingScreen.svelte";
   import MainMenu from "./MainMenu.svelte";
</script>

<svelte:window
   on:load={createPlayerInputListeners}
   on:keydown={onKeyDown}
   on:keyup={onKeyUp}
/>

{#if appState.state === AppState.mainMenu}
   <MainMenu />
{:else if appState.state === AppState.loading}
   <LoadingScreen />
{:else if appState.state === AppState.game}
   <GameScreen />
{/if}

<div id="canvas-wrapper" class:hidden={appState.state !== AppState.game}>
   <canvas id="game-canvas"></canvas>
   <canvas id="text-canvas"></canvas>
   <canvas id="tech-tree-canvas" class:hidden={!techTreeState.isVisible}></canvas>
   <canvas id="tribe-plan-visualiser-canvas" class="hidden"></canvas>
   <FrameGraph />
</div>

<style>
   #text-canvas {
      pointer-events: none;
   }
</style>