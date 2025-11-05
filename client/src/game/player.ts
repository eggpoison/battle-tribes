import { HitboxCollisionType, updateBox } from "../../../shared/src/boxes/boxes";
import CircularBox from "../../../shared/src/boxes/CircularBox";
import { CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { Entity, EntityType } from "../../../shared/src/entities";
import { angle, Point } from "../../../shared/src/utils";
import { setCameraSubject } from "./camera";
import { selectItemSlot } from "./player-action-handler";
import { createTransformComponentData, TransformComponentArray } from "./entity-components/server-components/TransformComponent";
import { createHitboxQuick, setHitboxAngle, setHitboxObservedAngularVelocity } from "./hitboxes";
import { closeCurrentMenu } from "./menus";
import { cursorScreenPos } from "./mouse-input";
import { InitialGameData } from "./networking/packet-receiving";
import { EntityServerComponentData } from "./networking/packet-snapshots";
import { registerDirtyRenderInfo } from "./rendering/render-part-matrices";
import { halfWindowHeight, halfWindowWidth } from "./webgl";
import { addEntityToWorld, createEntityCreationInfo, EntityComponentData, getEntityRenderInfo } from "./world";
import { setIsDeadState } from "../ui-state/game-ui-state.svelte";

// Doing it this way by importing the value directly (instead of calling a function to get it) will cause some overhead when accessing it,
// but this is in the client so these optimisations are less important. The ease-of-use is worth it
/** The player entity associated with the current player. If null, then the player is dead */
export let playerInstance: Entity | null = null;

export let isSpectating = false;

/** Username of the player. Empty string if the player's name has not yet been assigned. */
export let playerUsername = "";

const onPlayerRespawn = (): void => {
   selectItemSlot(1);
   setIsDeadState(false);
}

const onPlayerDeath = (): void => {
   setIsDeadState(true);
   
   // Close any open menus
   closeCurrentMenu();
}

export function setPlayerInstance(newPlayerInstance: Entity | null): void {
   // @Hack? done for both playerInstance and cameraSubject
   // If the player is spectating with a client-only entity, don't kill them!
   if (isSpectating && newPlayerInstance === null) {
      return;
   }
   
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

// @HAck this function is very hacky
export function createSpectatingPlayer(initialGameData: InitialGameData): void {
   // @Copynpaste @Hack

   const entity: Entity = 1;

   const serverComponents: EntityServerComponentData = {
      [ServerComponentType.transform]: createTransformComponentData(
         [
            // @COPYNPASTE from server player creation
            createHitboxQuick(entity, 0, null, new CircularBox(initialGameData.spawnPosition.copy(), new Point(0, 0), 0, 32), 1.25, HitboxCollisionType.soft, CollisionBit.default, 0, [])
         ]
      )
   };

   const entityComponentData: EntityComponentData = {
      entityType: EntityType.player,
      serverComponentData: serverComponents,
      // @Incomplete
      clientComponentData: {}
   };

   // Create the entity
   const creationInfo = createEntityCreationInfo(entity, entityComponentData);
   addEntityToWorld(0, initialGameData.spawnLayer, creationInfo);

   setPlayerInstance(entity);
   setCameraSubject(entity);
}

/** Updates the rotation of the player to match the cursor position */
export function updatePlayerRotation(): void {
   if (playerInstance === null) return;

   const relativeCursorX = cursorScreenPos.x - halfWindowWidth;
   const relativeCursorY = -cursorScreenPos.y + halfWindowHeight;

   const cursorDirection = angle(relativeCursorX, relativeCursorY);

   const transformComponent = TransformComponentArray.getComponent(playerInstance)!;
   const playerHitbox = transformComponent.hitboxes[0];
   
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
   // setHitboxAngularVelocity(playerHitbox, (playerHitbox.box.angle - previousAngle) * Settings.TICK_RATE);
   setHitboxObservedAngularVelocity(playerHitbox, 0);

   const renderInfo = getEntityRenderInfo(playerInstance);
   registerDirtyRenderInfo(renderInfo);
}