<script lang="ts">
   import { isSpectating } from "../../game/player";
   import { onGameMouseDown, onGameMouseUp } from "../../game/player-action-handler";
   import { gameInteractState, GameInteractState } from "../../ui-state/game-ui-state.svelte";
    import { hotbarChargeDurationState, hotbarChargeElapsedTicksState, hotbarItemRestTimeState, offhandChargeDurationState, offhandChargeElapsedTicksState, offhandItemRestTimeState } from "../../ui-state/player-action-state.svelte";
   import AttackChargeBar from "./AttackChargeBar.svelte";
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

<AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={hotbarChargeElapsedTicksState} chargeDuration={hotbarChargeDurationState} />
<AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={offhandChargeElapsedTicksState} chargeDuration={offhandChargeDurationState} />

{#if !props.cinematicModeIsEnabled}
   {#if isSpectating}
      <SpectatorControls />
   {:else}
      <Hotbar hotbar={props.hotbar} offhand={props.offhand} backpackSlot={props.backpackSlot} armourSlot={props.armourSlot} gloveSlot={props.gloveSlot} hotbarItemRestTimes={hotbarItemRestTimeState} offhandItemRestTimes={offhandItemRestTimeState} />
   {/if}
{/if}

{#if (gameInteractState === GameInteractState.selectCarryTarget || props.gameInteractState === GameInteractState.selectAttackTarget || props.gameInteractState === GameInteractState.selectMoveTargetPosition)}
   <SelectTargetCursorOverlay gameInteractState={props.gameInteractState} mouseX={mouseX} mouseY={mouseY} />
{/if}

<CursorTooltip />