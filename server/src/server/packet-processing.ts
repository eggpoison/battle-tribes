import { PacketReader } from "webgl-test-shared/dist/packets";
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
import { startEating, startChargingBow, startChargingSpear, startChargingBattleaxe } from "../entities/tribes/player";
import { calculateRadialAttackTargets } from "../entities/tribes/tribe-member";
import { beginSwing } from "../entities/tribes/limb-use";
import { InventoryComponentArray, getInventory, addItemToInventory } from "../components/InventoryComponent";

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
   const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);

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
   
   hotbarUseInfo.selectedItemSlot = selectedHotbarItemSlot;

   const playerComponent = PlayerComponentArray.getComponent(playerClient.instance);
   playerComponent.interactingEntityID = interactingEntityID;

   // @Bug: won't work for using medicine in offhand
   let overrideOffhand = false;
   
   if ((mainAction === LimbAction.eat || mainAction === LimbAction.useMedicine) && (hotbarUseInfo.action !== LimbAction.eat && hotbarUseInfo.action !== LimbAction.useMedicine)) {
      overrideOffhand = startEating(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeBow && hotbarUseInfo.action !== LimbAction.chargeBow) {
      startChargingBow(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeSpear && hotbarUseInfo.action !== LimbAction.chargeSpear) {
      startChargingSpear(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeBattleaxe && hotbarUseInfo.action !== LimbAction.chargeBattleaxe) {
      startChargingBattleaxe(playerClient.instance, InventoryName.hotbar);
   }

   if (!overrideOffhand) {
      const tribeComponent = TribeComponentArray.getComponent(playerClient.instance);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         const offhandUseInfo = inventoryUseComponent.getUseInfo(InventoryName.offhand);

         if ((offhandAction === LimbAction.eat || offhandAction === LimbAction.useMedicine) && (offhandUseInfo.action !== LimbAction.eat && offhandUseInfo.action !== LimbAction.useMedicine)) {
            startEating(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeBow && offhandUseInfo.action !== LimbAction.chargeBow) {
            startChargingBow(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeSpear && offhandUseInfo.action !== LimbAction.chargeSpear) {
            startChargingSpear(playerClient.instance, InventoryName.offhand);
         } else if (offhandAction === LimbAction.chargeBattleaxe && offhandUseInfo.action !== LimbAction.chargeBattleaxe) {
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