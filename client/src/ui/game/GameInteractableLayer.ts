import { scrollHotbarSelectedItemSlot } from "../../game/event-handling";
import { isSpectating } from "../../game/player";
import { onGameMouseDown, onGameMouseUp } from "../../game/player-action-handling";
import { GameInteractState, gameUIState } from "../../ui-state/game-ui-state";
import { playerActionState } from "../../ui-state/player-action-state";
// import AttackChargeBar from "./AttackChargeBar.svelte";
// import CursorEntityTooltip from "./dev/CursorEntityTooltip.svelte";
// import Hotbar from "./inventories/Hotbar.svelte";
// import SelectCarryTargetCursorOverlay from "./SelectCarryTargetCursorOverlay.svelte";
// import SpectatorControls from "./SpectatorControls.svelte";

let mouseX = 0;
let mouseY = 0;

function onMouseMove(e: MouseEvent): void {
   mouseX = e.clientX;
   mouseY = e.clientY;
}

function preventDefault(e: Event): void {
   e.preventDefault();
}

function onMouseEnterInteractable(): void {
   gameUIState.setIsHoveringOnMenu(false);
}

function onMouseLeaveInteractable(): void {
   gameUIState.setIsHoveringOnMenu(true);
}

export function openGameInteractableLayer(): void {
   const gameInteractableLayerElem = document.createElement("div");
   gameInteractableLayerElem.id = "game-interactable-layer";
   gameInteractableLayerElem.draggable = false;
   gameInteractableLayerElem.addEventListener("mouseenter", onMouseEnterInteractable);
   gameInteractableLayerElem.addEventListener("mouseleave", onMouseLeaveInteractable);
   gameInteractableLayerElem.addEventListener("mousemove", onMouseMove);
   gameInteractableLayerElem.addEventListener("mousedown", onGameMouseDown);
   gameInteractableLayerElem.addEventListener("mouseup", onGameMouseUp);
   gameInteractableLayerElem.addEventListener("contextmenu", preventDefault);
   gameInteractableLayerElem.addEventListener("wheel", scrollHotbarSelectedItemSlot, { passive: true });
   document.body.appendChild(gameInteractableLayerElem);
}

export function closeGameInteractableLayer(): void {
   document.getElementById("game-interactable-layer")?.remove();
}

// @SQUEAM
// <AttackChargeBar mouseX={mouseX} mouseY={mouseY} chargeElapsedTicks={playerActionState.hotbarChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />
// <AttackChargeBar mouseX={mouseX} mouseY={mouseY + 18} chargeElapsedTicks={playerActionState.offhandChargeElapsedTicks} chargeDuration={playerActionState.hotbarChargeDuration} />

// {#if !gameUIState.cinematicModeIsEnabled}
//    {#if isSpectating}
//       <SpectatorControls />
//    {:else}
//       <Hotbar />
//    {/if}
// {/if}

// {#if (gameUIState.gameInteractState === GameInteractState.selectCarryTarget || gameUIState.gameInteractState === GameInteractState.selectAttackTarget || gameUIState.gameInteractState === GameInteractState.selectMoveTargetPosition)}
//    <SelectCarryTargetCursorOverlay {mouseX} {mouseY} />
// {/if}

// <CursorEntityTooltip {mouseX} {mouseY} />