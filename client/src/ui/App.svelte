<script lang="ts">
   import { updateCursorScreenPos } from "../game/camera";
   import { onKeyDown, onKeyUp } from "../game/keyboard-input";
   import { createPlayerInputListeners } from "../game/player-action-handling";
   import { AppState, appState } from "../ui-state/app-state.svelte";
   import { gameUIState } from "../ui-state/game-ui-state.svelte";
   import { Menu, menuSelectorState } from "../ui-state/menu-selector-state.svelte";
   import FrameGraph from "./game/dev/FrameGraph.svelte";
   import GameScreen from "./game/GameScreen.svelte";
   import LoadingScreen from "./LoadingScreen.svelte";
   import MainMenu from "./MainMenu.svelte";

   const onMouseMove = (e: MouseEvent): void => {
      gameUIState.setCursorX(e.clientX);
      gameUIState.setCursorY(e.clientY);
      updateCursorScreenPos(e);
   }
</script>

<svelte:window
   on:load={createPlayerInputListeners}
   on:keydown={onKeyDown}
   on:keyup={onKeyUp}
   on:mousemove={onMouseMove}
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
   <canvas id="tech-tree-canvas" class:hidden={!menuSelectorState.menuIsOpen(Menu.techTree)}></canvas>
   <FrameGraph />
</div>

<style>
   #text-canvas {
      pointer-events: none;
   }
</style>