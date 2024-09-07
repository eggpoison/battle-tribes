import { Packet, PacketReader, PacketType } from "webgl-test-shared/dist/packets";
import PlayerClient from "./PlayerClient";
import { EntityID, LimbAction } from "webgl-test-shared/dist/entities";
import { InventoryName, ItemType } from "webgl-test-shared/dist/items/items";
import { TribeType } from "webgl-test-shared/dist/tribes";
import Board from "../Board";
import { InventoryUseComponentArray } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { startEating, startChargingBow, startChargingSpear, startChargingBattleaxe, createPlayerConfig } from "../entities/tribes/player";
import { calculateRadialAttackTargets, useItem } from "../entities/tribes/tribe-member";
import { beginSwing } from "../entities/tribes/limb-use";
import { InventoryComponentArray, getInventory, addItemToInventory } from "../components/InventoryComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { Point } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig } from "../Entity";
import { generatePlayerSpawnPosition } from "./player-clients";
import { addEntityDataToPacket, getEntityDataLength } from "./game-data-packets";

/** How far away from the entity the attack is done */
const ATTACK_OFFSET = 50;
/** Max distance from the attack position that the attack will be registered from */
const ATTACK_RADIUS = 50;

// @Cleanup: Messy as fuck
export function processPlayerDataPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const positionX = reader.readNumber();
   const positionY = reader.readNumber();
   const rotation = reader.readNumber();

   const selfVelocityX = reader.readNumber();
   const selfVelocityY = reader.readNumber();
   const externalVelocityX = reader.readNumber();
   const externalVelocityY = reader.readNumber();
   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();

   const screenWidth = reader.readNumber();
   const screenHeight = reader.readNumber();
   // const minVisibleChunkX = reader.readNumber();
   // const maxVisibleChunkX = reader.readNumber();
   // const minVisibleChunkY = reader.readNumber();
   // const maxVisibleChunkY = reader.readNumber();
   
   const selectedHotbarItemSlot = reader.readNumber();
   const mainAction = reader.readNumber() as LimbAction;
   const offhandAction = reader.readNumber() as LimbAction;

   const interactingEntityID = reader.readNumber();
   const gameDataOptions = reader.readNumber();

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(playerClient.instance);
   const hotbarLimbInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);

   const transformComponent = TransformComponentArray.getComponent(playerClient.instance);
   transformComponent.position.x = positionX;
   transformComponent.position.y = positionY;
   transformComponent.rotation = rotation;

   // playerClient.visibleChunkBounds = [minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY];
   playerClient.screenWidth = screenWidth;
   playerClient.screenHeight = screenHeight;
   playerClient.visibleChunkBounds = playerClient.getVisibleChunkBounds(transformComponent.position, screenWidth, screenHeight);
   playerClient.gameDataOptions = gameDataOptions;
   
   const physicsComponent = PhysicsComponentArray.getComponent(playerClient.instance);
   physicsComponent.hitboxesAreDirty = true;
   
   physicsComponent.selfVelocity.x = selfVelocityX;
   physicsComponent.selfVelocity.y = selfVelocityY;
   physicsComponent.externalVelocity.x = externalVelocityX;
   physicsComponent.externalVelocity.y = externalVelocityY;
   physicsComponent.acceleration.x = accelerationX;
   physicsComponent.acceleration.y = accelerationY;
   
   hotbarLimbInfo.selectedItemSlot = selectedHotbarItemSlot;

   const playerComponent = PlayerComponentArray.getComponent(playerClient.instance);
   playerComponent.interactingEntityID = interactingEntityID;

   // @Bug: won't work for using medicine in offhand
   let overrideOffhand = false;
   
   if ((mainAction === LimbAction.eat || mainAction === LimbAction.useMedicine) && (hotbarLimbInfo.action !== LimbAction.eat && hotbarLimbInfo.action !== LimbAction.useMedicine)) {
      overrideOffhand = startEating(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeBow && hotbarLimbInfo.action !== LimbAction.chargeBow) {
      startChargingBow(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeSpear && hotbarLimbInfo.action !== LimbAction.chargeSpear) {
      startChargingSpear(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeBattleaxe && hotbarLimbInfo.action !== LimbAction.chargeBattleaxe) {
      startChargingBattleaxe(playerClient.instance, InventoryName.hotbar);
   }

   if (!overrideOffhand) {
      const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         const offhandLimbInfo = inventoryUseComponent.getUseInfo(InventoryName.offhand);

         if ((offhandAction === LimbAction.eat || offhandAction === LimbAction.useMedicine) && (offhandLimbInfo.action !== LimbAction.eat && offhandLimbInfo.action !== LimbAction.useMedicine)) {
            startEating(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeBow && offhandLimbInfo.action !== LimbAction.chargeBow) {
            startChargingBow(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeSpear && offhandLimbInfo.action !== LimbAction.chargeSpear) {
            startChargingSpear(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeBattleaxe && offhandLimbInfo.action !== LimbAction.chargeBattleaxe) {
            startChargingBattleaxe(playerClient.instance, InventoryName.offhand);
         }
      }
   }
}

// @Cleanup: most of this logic and that in attemptSwing should be done in tribe-member.ts
export function processPlayerAttackPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!Board.hasEntity(player)) {
      return;
   }

   const itemSlot = reader.readNumber();
   // @Cleanup: unused?
   const attackDirection = reader.readNumber();
   
   const targets = calculateRadialAttackTargets(player, ATTACK_OFFSET, ATTACK_RADIUS);

   // const didSwingWithRightHand = attemptSwing(player, targets, itemSlot, InventoryName.hotbar);
   const didSwingWithRightHand = beginSwing(player, itemSlot, InventoryName.hotbar);
   if (didSwingWithRightHand) {
      return;
   }

   // If a barbarian, attack with offhand
   const tribeComponent = TribeComponentArray.getComponent(player);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
      // attemptSwing(player, targets, 1, InventoryName.offhand);
      beginSwing(player, 1, InventoryName.offhand);
   }
}

export function processDevGiveItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!Board.hasEntity(player)) {
      return;
   }

   const itemType = reader.readNumber() as ItemType;
   const amount = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
   addItemToInventory(inventory, itemType, amount);
}

export function processRespawnPacket(playerClient: PlayerClient): void {
   // Calculate spawn position
   let spawnPosition: Point;
   if (playerClient.tribe.totem !== null) {
      const totemTransformComponent = TransformComponentArray.getComponent(playerClient.tribe.totem);
      spawnPosition = totemTransformComponent.position.copy();
      const offsetDirection = 2 * Math.PI * Math.random();
      spawnPosition.x += 100 * Math.sin(offsetDirection);
      spawnPosition.y += 100 * Math.cos(offsetDirection);
   } else {
      spawnPosition = generatePlayerSpawnPosition(playerClient.tribe.tribeType);
   }

   const config = createPlayerConfig();
   config[ServerComponentType.transform].position.x = spawnPosition.x;
   config[ServerComponentType.transform].position.y = spawnPosition.y;
   config[ServerComponentType.tribe].tribe = playerClient.tribe;
   config[ServerComponentType.player].username = playerClient.username;
   const player = createEntityFromConfig(config);

   playerClient.instance = player;

   // The PlayerComponent onJoin function will send the packet with all the information
}

export function sendRespawnDataPacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   
   let lengthBytes = Float32Array.BYTES_PER_ELEMENT;
   lengthBytes += getEntityDataLength(player, player);
   
   const packet = new Packet(PacketType.respawnData, lengthBytes);

   addEntityDataToPacket(packet, player, player);

   playerClient.socket.send(packet.buffer);
}

export function processUseItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!Board.hasEntity(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(playerClient.instance);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(playerClient.instance, item, InventoryName.hotbar, itemSlot);
   }
}