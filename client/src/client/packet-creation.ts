import { alignLengthBytes, Packet, PacketType } from "webgl-test-shared/dist/packets";
import Player from "../entities/Player";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { latencyGameState } from "../game-state/game-states";
import { getSelectedEntityID } from "../entity-selection";
import { EntityType } from "webgl-test-shared/dist/entities";
import Board from "../Board";
import { GameDataPacketOptions } from "webgl-test-shared/dist/client-server-types";
import OPTIONS from "../options";
import { windowHeight, windowWidth } from "../webgl";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import Client from "./Client";
import { getHotbarSelectedItemSlot, getInstancePlayerAction } from "../player-input";

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
   packet.addNumber(physicsComponent.selfVelocity.x);
   packet.addNumber(physicsComponent.selfVelocity.y);
   packet.addNumber(physicsComponent.externalVelocity.x);
   packet.addNumber(physicsComponent.externalVelocity.y);
   packet.addNumber(physicsComponent.acceleration.x);
   packet.addNumber(physicsComponent.acceleration.y);
   packet.addNumber(physicsComponent.angularVelocity);

   packet.addNumber(windowWidth);
   packet.addNumber(windowHeight);

   packet.addNumber(getHotbarSelectedItemSlot());
   packet.addNumber(getInstancePlayerAction(InventoryName.hotbar));
   packet.addNumber(getInstancePlayerAction(InventoryName.offhand));

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

export function createAttackPacket(): ArrayBuffer {
   const transformComponent = Player.instance!.getServerComponent(ServerComponentType.transform);
   
   const packet = new Packet(PacketType.attack, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.addNumber(getHotbarSelectedItemSlot());
   packet.addNumber(transformComponent.rotation);
   
   return packet.buffer;
}

export function sendDevGiveItemPacket(itemType: ItemType, amount: number): void {
   const packet = new Packet(PacketType.devGiveItem, 3 * Float32Array.BYTES_PER_ELEMENT);

   packet.addNumber(itemType);
   packet.addNumber(amount);

   Client.sendPacket(packet.buffer);
}

export function sendRespawnPacket(): void {
   const packet = new Packet(PacketType.respawn, Float32Array.BYTES_PER_ELEMENT);
   Client.sendPacket(packet.buffer);
}

export function sendItemUsePacket(): void {
   const packet = new Packet(PacketType.useItem, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   packet.addNumber(getHotbarSelectedItemSlot());

   Client.sendPacket(packet.buffer);
}

export function sendStopItemUsePacket(): void {
   const packet = new Packet(PacketType.stopItemUse, Float32Array.BYTES_PER_ELEMENT);
   Client.sendPacket(packet.buffer);
}