import { Packet, ClientPacketType, InventoryName, GameDataPacketOptions } from "../../../../../shared/src";
import { debugDisplayState } from "../../../ui-state/debug-display-state";
import { cameraPosition } from "../../camera";
import { transformComponentArray } from "../../entity-components/server-components/TransformComponent";
import { getPlayerInputDirection } from "../../event-handling";
import { playerInstance, isSpectating } from "../../player";
import { getHotbarSelectedItemSlot, getInstancePlayerAction } from "../../player-action-handling";
import { sendData } from "../socket";

// ====================================
// PLAYER DATA PACKET
// 
// Packet type
//  - 1 float || 4 bytes
// Position, rotation
//  - 3 floats || 12 bytes + 4 = 16
// Previous position and acceleration
//  - 4 floats || 16 bytes + 16 = 32
// Move intention
//  - 1 float || 4 bytes + 32 = 36
// Previous relative angle, and angular acceleration
//  - 2 floats || 8 bytes + 36 = 44
// Inventory shit
//  - 3 floats || 12 bytes + 44 = 56
// Other random shit
//  - 2 floats || 8 bytes + 56 = 64
// 
// TOTAL = 64 BYTES (aligned)
// 

const playerDataPacketBuffer = new ArrayBuffer(64);
const playerDataPacket = new Packet(ClientPacketType.playerData, 64, playerDataPacketBuffer);

export function sendPlayerDataPacket(): void {
   let x: number, y: number;
   let angle: number;
   let previousX: number, previousY: number;
   let accelX: number, accelY: number;
   let previousRelativeAngle: number;
   let angularAcceleration: number;

   if (playerInstance !== null) {
      const transformComponent = transformComponentArray.getComponent(playerInstance);
      const playerHitbox = transformComponent.hitboxes[0];

      x = playerHitbox.box.posX;
      y = playerHitbox.box.posY;
      angle = playerHitbox.box.angle;
      previousX = playerHitbox.previousPosX;
      previousY = playerHitbox.previousPosY;
      accelX = playerHitbox.accelX;
      accelY = playerHitbox.accelY;
      previousRelativeAngle = playerHitbox.previousRelativeAngle;
      angularAcceleration = playerHitbox.angularAcceleration;
   } else if (isSpectating) {
      x = cameraPosition.x;
      y = cameraPosition.y;
      angle = 0;
      previousX = cameraPosition.x;
      previousY = cameraPosition.y;
      accelX = 0;
      accelY = 0;
      previousRelativeAngle = 0;
      angularAcceleration = 0;
   } else {
      // To not waste unnecessary bandwidth with a useless player data packet
      return;
   }

   const moveInputDirection = getPlayerInputDirection();
   const hotbarSelectedItemSlot = getHotbarSelectedItemSlot();
   const hotbarAction = getInstancePlayerAction(InventoryName.hotbar);
   const offhandAction = getInstancePlayerAction(InventoryName.offhand);
   const gameDataOptions = getGameDataOptions();

   // Don't send redundant data
   playerDataPacket.reset();
   if (playerDataPacket.checkNumber(x) &&
       playerDataPacket.checkNumber(y) &&
       playerDataPacket.checkNumber(angle) &&
       playerDataPacket.checkNumber(previousX) &&
       playerDataPacket.checkNumber(previousY) &&
       playerDataPacket.checkNumber(accelX) &&
       playerDataPacket.checkNumber(accelY) &&
       playerDataPacket.checkNumber(moveInputDirection) &&
       playerDataPacket.checkNumber(previousRelativeAngle) &&
       playerDataPacket.checkNumber(angularAcceleration) &&
       playerDataPacket.checkNumber(hotbarSelectedItemSlot) &&
       playerDataPacket.checkNumber(hotbarAction) &&
       playerDataPacket.checkNumber(offhandAction) &&
       playerDataPacket.checkNumber(gameDataOptions)) {
      return;
   }
   
   playerDataPacket.reset();

   playerDataPacket.writeNumber(x);
   playerDataPacket.writeNumber(y);
   playerDataPacket.writeNumber(angle);

   playerDataPacket.writeNumber(previousX);
   playerDataPacket.writeNumber(previousY);
   playerDataPacket.writeNumber(accelX);
   playerDataPacket.writeNumber(accelY);

   playerDataPacket.writeNumber(moveInputDirection);

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