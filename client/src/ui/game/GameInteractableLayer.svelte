<script lang="ts">
   import { isSpectating } from "../../game/player";
   import { onGameMouseDown, onGameMouseUp } from "../../game/player-action-handler";
   import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state.svelte";
   import { playerActionState } from "../../ui-state/player-action-state.svelte";
   import AttackChargeBar from "./AttackChargeBar.svelte";
   import CursorEntityTooltip from "./dev/CursorEntityTooltip.svelte";
   import HeldItemSlot from "./HeldItemSlot.svelte";
   import Hotbar from "./inventories/Hotbar.svelte";
   import SpectatorControls from "./SpectatorControls.svelte";

   let mouseX = $state(0);
   let mouseY = $state(0);
   
   let props = $props();

   function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY;
   }
   
   function preventDefault(e: Event) {
      e.preventDefault();
   }
</script>

<div id="game-interactable-layer" draggable={false} onmousemove={onMouseMove} onmousedown={onGameMouseDown} onmouseup={onGameMouseUp} oncontextmenu={preventDefault} aria-hidden="true"></div>

<HeldItemSlot mouseX={mouseX} mouseY={mouseY} />

<AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={playerActionState.hotbarChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />
<AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={playerActionState.offhandChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />

{#if !props.cinematicModeIsEnabled}
   {#if isSpectating}
      <SpectatorControls />
   {:else}
      <Hotbar />
   {/if}
{/if}

{#if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectAttackTarget || gameUIState.gameInteractState === GameInteractState.selectMoveTargetPosition)}
   <SelectTargetCursorOverlay gameInteractState={props.gameInteractState} mouseX={mouseX} mouseY={mouseY} />
{/if}

<CursorEntityTooltip />