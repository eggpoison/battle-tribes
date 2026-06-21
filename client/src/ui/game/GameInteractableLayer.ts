import { scrollHotbarSelectedItemSlot } from "../../game/event-handling";
import { isSpectating } from "../../game/player";
import { onGameMouseDown, onGameMouseUp } from "../../game/player-action-handling";
import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state";
import { playerActionState } from "../../ui-state/player-action-state";
import { updateHeldItemPosition } from "./HeldItem";
// @Incomplete
// import AttackChargeBar from "./AttackChargeBar.svelte";
// import CursorEntityTooltip from "./dev/CursorEntityTooltip.svelte";
// import Hotbar from "./inventories/Hotbar.svelte";
// import SelectCarryTargetCursorOverlay from "./SelectCarryTargetCursorOverlay.svelte";
// import SpectatorControls from "./SpectatorControls.svelte";

function onMouseEnterInteractable(): void {
   gameUIState.setIsHoveringOnMenu(false);
}

function onMouseLeaveInteractable(): void {
   gameUIState.setIsHoveringOnMenu(true);
}

export function openGameInteractableLayer(): void {
   // @Speed: can't this just be on the canvas.
   const gameInteractableLayerElem = document.createElement("div");
   gameInteractableLayerElem.id = "game-interactable-layer";
   gameInteractableLayerElem.draggable = false;
   gameInteractableLayerElem.onmouseenter = onMouseEnterInteractable;
   gameInteractableLayerElem.onmouseleave = onMouseLeaveInteractable;
   gameInteractableLayerElem.onmousedown = onGameMouseDown;
   gameInteractableLayerElem.onmouseup = onGameMouseUp;
   gameInteractableLayerElem.addEventListener("wheel", scrollHotbarSelectedItemSlot, { passive: true });
   document.body.appendChild(gameInteractableLayerElem);
}

export function closeGameInteractableLayer(): void {
   document.getElementById("game-interactable-layer")?.remove();
}

// @SQUEAM
// @Incomplete
// <AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={playerActionState.hotbarChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />
// <AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={playerActionState.offhandChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />

// @Incomplete
// {#if !gameUIState.cinematicModeIsEnabled}
//    {#if isSpectating}
//       <SpectatorControls />
//    {:else}
//       <Hotbar />
//    {/if}
// {/if}

// @Incomplete
// {#if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectAttackTarget || gameUIState.gameInteractState === GameInteractState.selectMoveTargetPosition)}
//    <SelectCarryTargetCursorOverlay {mouseX} {mouseY} />
// {/if}

// @Incomplete
// <CursorEntityTooltip {mouseX} {mouseY} />