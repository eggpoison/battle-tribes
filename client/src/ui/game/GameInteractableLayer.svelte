<script lang="ts">
   import { isSpectating } from "../../game/player";
   import { onGameMouseDown, onGameMouseUp } from "../../game/player-action-handler";
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";
   import { playerActionState } from "../../ui-state/player-action-state.svelte";
   import AttackChargeBar from "./AttackChargeBar.svelte";
   import CursorEntityTooltip from "./dev/CursorEntityTooltip.svelte";
   import Hotbar from "./inventories/Hotbar.svelte";
   import SelectCarryTargetCursorOverlay from "./SelectCarryTargetCursorOverlay.svelte";
   import SpectatorControls from "./SpectatorControls.svelte";

   let mouseX = $state(0);
   let mouseY = $state(0);
   
   function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY;
   }
   
   function preventDefault(e: Event) {
      e.preventDefault();
   }

   function onMouseEnterInteractable(): void {
      gameUIState.setIsFocusedOnMenu(false);
   }

   function onMouseLeaveInteractable(): void {
      gameUIState.setIsFocusedOnMenu(true);
   }
</script>

<div id="game-interactable-layer" draggable={false} onmouseenter={onMouseEnterInteractable} onmouseleave={onMouseLeaveInteractable} onmousemove={onMouseMove} onmousedown={onGameMouseDown} onmouseup={onGameMouseUp} oncontextmenu={preventDefault} aria-hidden="true"></div>

<AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={playerActionState.hotbarChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />
<AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={playerActionState.offhandChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />

{#if !gameUIState.cinematicModeIsEnabled}
   {#if isSpectating}
      <SpectatorControls />
   {:else}
      <Hotbar />
   {/if}
{/if}

{#if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectAttackTarget || gameUIState.gameInteractState === GameInteractState.selectMoveTargetPosition)}
   <SelectCarryTargetCursorOverlay {mouseX} {mouseY} />
{/if}

<CursorEntityTooltip {mouseX} {mouseY} />