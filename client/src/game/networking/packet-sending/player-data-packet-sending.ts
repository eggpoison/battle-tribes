import { Packet, PacketType, Point, InventoryName, EntityType, GameDataPacketOptions } from "../../../../../shared/src";
import { debugDisplayState } from "../../../ui-state/debug-display-state";
import { entitySelectionState } from "../../../ui-state/entity-selection-state";
import { cameraPosition } from "../../camera";
import { sendData } from "../../client";
import { TransformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { playerInstance, isSpectating } from "../../player";
import { getPlayerMoveIntention, getHotbarSelectedItemSlot, getInstancePlayerAction } from "../../player-action-handling";

/*///////////////

Packet type
 - 1 float || 4 bytes
Position, rotation
 - 3 floats || 12 bytes + 4 = 16
Previous position and acceleration
 - 4 floats || 16 bytes + 16 = 32
Move intention
 - 1 float || 4 bytes + 32 = 36
Previous relative angle, and angular acceleration
 - 2 floats || 8 bytes + 36 = 44
Inventory shit
 - 3 floats || 12 bytes + 44 = 56
Other random shit
 - 2 floats || 8 bytes + 56 = 64

TOTAL = 64 BYTES (aligned)

*////////////////

const playerDataPacketBuffer = new ArrayBuffer(64);
const playerDataPacket = new Packet(PacketType.playerData, 64, playerDataPacketBuffer);

export function sendPlayerDataPacket(): void {
   let position: Point;
   let angle: number;
   let previousPosition: Point;
   let acceleration: Point;
   let previousRelativeAngle: number;
   let angularAcceleration: number;

   if (playerInstance !== null) {
      const transformComponent = TransformComponentArray.getComponent(playerInstance);
      const playerHitbox = transformComponent.hitboxes[0];

      position = playerHitbox.box.position;
      angle = playerHitbox.box.angle;
      previousPosition = playerHitbox.previousPosition;
      acceleration = playerHitbox.acceleration
      previousRelativeAngle = playerHitbox.previousRelativeAngle;
      angularAcceleration = playerHitbox.angularAcceleration;
   } else if (isSpectating) {
      position = cameraPosition;
      angle = 0;
      previousPosition = cameraPosition;
      acceleration = new Point(0, 0);
      previousRelativeAngle = 0;
      angularAcceleration = 0;
   } else {
      // To not waste unnecessary bandwidth with a useless player data packet
      return;
   }

   const movementIntention = getPlayerMoveIntention();
   const hotbarSelectedItemSlot = getHotbarSelectedItemSlot();
   const hotbarAction = getInstancePlayerAction(InventoryName.hotbar);
   const offhandAction = getInstancePlayerAction(InventoryName.offhand);
   const gameDataOptions = getGameDataOptions();

   // Don't send redundant data
   playerDataPacket.reset();
   if (playerDataPacket.checkPoint(position) &&
       playerDataPacket.checkNumber(angle) &&
       playerDataPacket.checkPoint(previousPosition) &&
       playerDataPacket.checkPoint(acceleration) &&
       playerDataPacket.checkNumber(movementIntention) &&
       playerDataPacket.checkNumber(previousRelativeAngle) &&
       playerDataPacket.checkNumber(angularAcceleration) &&
       playerDataPacket.checkNumber(hotbarSelectedItemSlot) &&
       playerDataPacket.checkNumber(hotbarAction) &&
       playerDataPacket.checkNumber(offhandAction) &&
       playerDataPacket.checkNumber(gameDataOptions)) {
      // @SQUEAM
      // console.log(Math.random())
      return;
   } else {
      // @SQUEAM
      // console.log("NORMAL!")
   }
   
   playerDataPacket.reset();

   playerDataPacket.writePoint(position);
   playerDataPacket.writeNumber(angle);

   playerDataPacket.writePoint(previousPosition);
   playerDataPacket.writePoint(acceleration);

   playerDataPacket.writeNumber(movementIntention);

   playerDataPacket.writeNumber(previousRelativeAngle);
   playerDataPacket.writeNumber(angularAcceleration);

   playerDataPacket.writeNumber(hotbarSelectedItemSlot);
   playerDataPacket.writeNumber(hotbarAction);
   playerDataPacket.writeNumber(offhandAction);

   // @BANDWIDTH: only needed for dev!! unnecessary
   playerDataPacket.writeNumber(gameDataOptions);
   
   sendData(playerDataPacketBuffer);
}

const getGameDataOptions = () => {
   let gameDataOptions = 0;
   if (debugDisplayState.showPathfindingNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisiblePathfindingNodeOccupances;
   }
   if (debugDisplayState.showSafetyNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleSafetyNodes;
   }
   if (debugDisplayState.showBuildingPlans) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingPlans;
   }
   if (debugDisplayState.showBuildingSafetys) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingSafetys;
   }
   if (debugDisplayState.showRestrictedAreas) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleRestrictedBuildingAreas;
   }
   if (debugDisplayState.showWallConnections) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleWallConnections;
   }
   if (debugDisplayState.showSubtileSupports) {
      gameDataOptions |= GameDataPacketOptions.sendSubtileSupports;
   }
   if (debugDisplayState.showLightLevels) {
      gameDataOptions |= GameDataPacketOptions.sendLightLevels;
   }
   return gameDataOptions;
}