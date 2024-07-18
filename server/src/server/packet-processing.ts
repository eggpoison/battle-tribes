import { PacketReader } from "webgl-test-shared/dist/packets";
import PlayerClient from "./PlayerClient";
import { LimbAction } from "webgl-test-shared/dist/entities";
import { InventoryName } from "webgl-test-shared/dist/items/items";
import { TribeType } from "webgl-test-shared/dist/tribes";
import Board from "../Board";
import { InventoryUseComponentArray } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { startEating, startChargingBow, startChargingSpear, startChargingBattleaxe } from "../entities/tribes/player";

// @Cleanup: Messy as fuck
export function processPlayerDataPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!Board.hasEntity(playerClient.instance)) {
      return;
   }

   const positionX = reader.readNumber();
   const positionY = reader.readNumber();
   const rotation = reader.readNumber();

   const velocityX = reader.readNumber();
   const velocityY = reader.readNumber();
   const accelerationX = reader.readNumber();
   const accelerationY = reader.readNumber();

   const minVisibleChunkX = reader.readNumber();
   const maxVisibleChunkX = reader.readNumber();
   const minVisibleChunkY = reader.readNumber();
   const maxVisibleChunkY = reader.readNumber();
   
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

   playerClient.visibleChunkBounds = [minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY];
   playerClient.gameDataOptions = gameDataOptions;
   
   const physicsComponent = PhysicsComponentArray.getComponent(playerClient.instance);
   physicsComponent.hitboxesAreDirty = true;
   
   physicsComponent.velocity.x = velocityX;
   physicsComponent.velocity.y = velocityY;
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
   } else {
      hotbarUseInfo.action = mainAction;
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
         } else {
            offhandUseInfo.action = offhandAction;
         }
      }
   }
}