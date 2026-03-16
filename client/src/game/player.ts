import { Entity, updateBox } from "webgl-test-shared";
import { cursorWorldPos } from "./camera";
import { selectItemSlot } from "./player-action-handling";
import { TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { setHitboxAngle, setHitboxObservedAngularVelocity } from "./hitboxes";
import { calculateHitboxRenderPosition, getEntityTickInterp, registerDirtyRenderInfo } from "./rendering/render-part-matrices";
import { getEntityRenderInfo } from "./world";
import { gameUIState } from "../ui-state/game-ui-state";
import { menuSelectorState } from "../ui-state/menu-selector-state";
import { destroyHealthBar } from "../ui/game/HealthBar";
import { deathScreen } from "../ui-state/death-screen-funcs";

// Doing it this way by importing the value directly (instead of calling a function to get it) will cause some overhead when accessing it,
// but this is in the client so these optimisations are less important. The ease-of-use is worth it
/** The player entity associated with the current player. If null, then the player is dead */
export let playerInstance: Entity | null = null;

export let isSpectating = false;

/** Username of the player. Empty string if the player's name has not yet been assigned. */
export let playerUsername = "";

const onPlayerRespawn = (): void => {
   selectItemSlot(1);
   gameUIState.setIsDead(false);
}

const onPlayerDeath = (): void => {
   gameUIState.setIsDead(true);

   destroyHealthBar();
   deathScreen.open();
   
   // Close any open menus
   while (menuSelectorState.closeCurrentMenu());
}

export function setPlayerInstance(newPlayerInstance: Entity | null): void {
   const previousPlayerInstance = playerInstance;
   playerInstance = newPlayerInstance;
   if (previousPlayerInstance === null && newPlayerInstance !== null) {
      onPlayerRespawn();
   } else if (previousPlayerInstance !== null && newPlayerInstance === null) {
      onPlayerDeath();
   }
}

export function setIsSpectating(newIsSpectating: boolean): void {
   isSpectating = newIsSpectating;
}

export function setPlayerUsername(username: string): void {
   playerUsername = username;
}

/** Updates the rotation of the player to match the cursor position */
export function updatePlayerDirection(clientTickInterp: number, serverTickInterp: number): void {
   if (playerInstance === null) return;

   // Don't turn the player if they're meddling about in an inventory, cuz they're not actually looking at stuff while they're doing that
   if (menuSelectorState.hasOpenNonEmbodiedMenu()) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(playerInstance);
   const playerHitbox = transformComponent.hitboxes[0];

   // Use the render position instead of the hitboxes' actual game position, as that is not up-to-date for each and every rendered frame.
   const tickInterp = getEntityTickInterp(playerInstance, clientTickInterp, serverTickInterp);
   const playerHitboxRenderPos = calculateHitboxRenderPosition(playerHitbox, tickInterp);

   const cursorDirection = playerHitboxRenderPos.angleTo(cursorWorldPos);
   
   const previousAngle = playerHitbox.box.angle;

   setHitboxAngle(playerHitbox, cursorDirection);
   // We've changed the relative angle, in a weird place where idk if its guaranteed that it will be cleaned in time for it to register correctly.
   // so now do this
   if (playerHitbox.parent !== null) {
      updateBox(playerHitbox.box, playerHitbox.parent.box);
   } else {
      playerHitbox.box.angle = playerHitbox.box.relativeAngle;
   }

   // Angular velocity
   // We don't use relativeAngle here cuz that wouldn't work for when the player is mounted.
   // setHitboxObservedAngularVelocity(playerHitbox, (playerHitbox.box.angle - previousAngle) * Settings.TICK_RATE);
   setHitboxObservedAngularVelocity(playerHitbox, 0);

   const renderInfo = getEntityRenderInfo(playerInstance);
   registerDirtyRenderInfo(renderInfo);
}

// @INCOMPLETE
// if (import.meta.hot) {
//    if (playerInstance !== null) {
//       createHotbar();
//    }

//    import.meta.hot.dispose(() => {
//       hotbarElem?.remove();
//    });
   
//    import.meta.hot.accept();
// }