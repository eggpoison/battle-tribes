import { alignLengthBytes, Packet, PacketType } from "webgl-test-shared/dist/packets";
import Player from "../entities/Player";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import Camera from "../Camera";
import { latencyGameState } from "../game-state/game-states";
import { getSelectedEntityID } from "../entity-selection";
import { EntityType } from "webgl-test-shared/dist/entities";
import Board from "../Board";
import { GameDataPacketOptions } from "webgl-test-shared/dist/client-server-types";
import OPTIONS from "../options";

export function createPlayerDataPacket(): ArrayBuffer {
   let lengthBytes = 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 4 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 3 * Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += 2 * Float32Array.BYTES_PER_ELEMENT;
   
   lengthBytes = alignLengthBytes(lengthBytes);
   
   const packet = new Packet(PacketType.playerData, lengthBytes);
   
   const transformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
   packet.addNumber(transformComponent.position.x);
   packet.addNumber(transformComponent.position.y);
   packet.addNumber(transformComponent.rotation);

   const physicsComponent = Player.instance!.getServerComponent(ServerComponentType.physics);
   packet.addNumber(physicsComponent.velocity.x);
   packet.addNumber(physicsComponent.velocity.y);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);

   const visibleChunkBounds = Camera.getVisibleChunkBounds();
   packet.addNumber(visibleChunkBounds[0]);
   packet.addNumber(visibleChunkBounds[1]);
   packet.addNumber(visibleChunkBounds[2]);
   packet.addNumber(visibleChunkBounds[3]);

   packet.addNumber(latencyGameState.selectedHotbarItemSlot);
   packet.addNumber(latencyGameState.mainAction);
   packet.addNumber(latencyGameState.offhandAction);

   let interactingEntityID = 0;
   const selectedEntityID = getSelectedEntityID();

   const selectedEntity = Board.entityRecord[selectedEntityID];
   if (typeof selectedEntity !== "undefined") {
      if (selectedEntity.type === EntityType.tribeWorker || selectedEntity.type === EntityType.tribeWarrior) {
         interactingEntityID = selectedEntity.id;
      }
   }

   packet.addNumber(interactingEntityID);
   
   let gameDataOptions = 0;
   if (OPTIONS.showPathfindingNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisiblePathfindingNodeOccupances;
   }
   if (OPTIONS.showSafetyNodes) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleSafetyNodes;
   }
   if (OPTIONS.showBuildingPlans) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingPlans;
   }
   if (OPTIONS.showBuildingSafetys) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleBuildingSafetys;
   }
   if (OPTIONS.showRestrictedAreas) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleRestrictedBuildingAreas;
   }
   if (OPTIONS.showWallConnections) {
      gameDataOptions |= GameDataPacketOptions.sendVisibleWallConnections;
   }
   packet.addNumber(gameDataOptions);
   
   return packet.buffer;
}

export function createActivatePacket(): ArrayBuffer {
   const packet = new Packet(PacketType.activate, Float32Array.BYTES_PER_ELEMENT);
   return packet.buffer;
}

export function createSyncRequestPacket(): ArrayBuffer {
   const packet = new Packet(PacketType.syncRequest, Float32Array.BYTES_PER_ELEMENT);
   return packet.buffer;
}