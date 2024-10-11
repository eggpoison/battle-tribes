import { alignLengthBytes, Packet, PacketType } from "battletribes-shared/packets";
import Player from "../entities/Player";
import { ServerComponentType } from "battletribes-shared/components";
import { getSelectedEntityID } from "../entity-selection";
import { EntityType } from "battletribes-shared/entities";
import { GameDataPacketOptions } from "battletribes-shared/client-server-types";
import OPTIONS from "../options";
import { windowHeight, windowWidth } from "../webgl";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import Client from "./Client";
import { getHotbarSelectedItemSlot, getInstancePlayerAction } from "../components/game/GameInteractableLayer";
import { getEntityByID, getEntityType } from "../world";

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

   const selectedEntity = getEntityByID(selectedEntityID);
   if (typeof selectedEntity !== "undefined") {
      const entityType = getEntityType(selectedEntityID);
      if (entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior) {
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

export function sendStartItemUsePacket(): void {
   const packet = new Packet(PacketType.startItemUse, 2 * Float32Array.BYTES_PER_ELEMENT);
   
   packet.addNumber(getHotbarSelectedItemSlot());

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

export function sendItemDropPacket(isOffhand: boolean, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const packet = new Packet(PacketType.dropItem, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.addBoolean(isOffhand);
   packet.padOffset(3);
   packet.addNumber(itemSlot);
   packet.addNumber(dropAmount);
   packet.addNumber(throwDirection);

   Client.sendPacket(packet.buffer);
}


export function sendItemPickupPacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemPickup, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.addNumber(entityID);
   packet.addNumber(inventoryName);
   packet.addNumber(itemSlot);
   packet.addNumber(amount);

   Client.sendPacket(packet.buffer);
}

export function sendItemReleasePacket(entityID: number, inventoryName: InventoryName, itemSlot: number, amount: number): void {
   const packet = new Packet(PacketType.itemRelease, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.addNumber(entityID);
   packet.addNumber(inventoryName);
   packet.addNumber(itemSlot);
   packet.addNumber(amount);

   Client.sendPacket(packet.buffer);
}

export function sendEntitySummonPacket(entityType: EntityType, x: number, y: number, rotation: number): void {
   const packet = new Packet(PacketType.summonEntity, 5 * Float32Array.BYTES_PER_ELEMENT);

   packet.addNumber(entityType);
   packet.addNumber(x);
   packet.addNumber(y);
   packet.addNumber(rotation);

   Client.sendPacket(packet.buffer);
}

export function sendToggleSimulationPacket(isSimulating: boolean): void {
   const packet = new Packet(PacketType.toggleSimulation, 2 * Float32Array.BYTES_PER_ELEMENT);

   packet.addBoolean(isSimulating);
   packet.padOffset(3);

   Client.sendPacket(packet.buffer);
}