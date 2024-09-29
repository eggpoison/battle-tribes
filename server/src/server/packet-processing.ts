import { Packet, PacketReader, PacketType } from "battletribes-shared/packets";
import PlayerClient from "./PlayerClient";
import { EntityID, LimbAction } from "battletribes-shared/entities";
import { BowItemInfo, ConsumableItemCategory, ConsumableItemInfo, getItemAttackInfo, InventoryName, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, ItemType } from "battletribes-shared/items/items";
import { TribeType } from "battletribes-shared/tribes";
import Layer from "../Layer";
import { getHeldItem, InventoryUseComponentArray, setLimbActions } from "../components/InventoryUseComponent";
import { PhysicsComponentArray } from "../components/PhysicsComponent";
import { PlayerComponentArray } from "../components/PlayerComponent";
import { TransformComponentArray } from "../components/TransformComponent";
import { TribeComponentArray } from "../components/TribeComponent";
import { startChargingSpear, startChargingBattleaxe, createPlayerConfig } from "../entities/tribes/player";
import { calculateRadialAttackTargets, throwItem, useItem } from "../entities/tribes/tribe-member";
import { beginSwing } from "../entities/tribes/limb-use";
import { InventoryComponentArray, getInventory, addItemToInventory, addItemToSlot, consumeItemFromSlot, consumeItemTypeFromInventory } from "../components/InventoryComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { Point } from "battletribes-shared/utils";
import { createEntityFromConfig } from "../Entity";
import { generatePlayerSpawnPosition, registerDirtyEntity } from "./player-clients";
import { addEntityDataToPacket, getEntityDataLength } from "./game-data-packets";
import { createItem } from "../items";
import { entityExists, getEntityLayer, surfaceLayer } from "../world";

/** How far away from the entity the attack is done */
const ATTACK_OFFSET = 50;
/** Max distance from the attack position that the attack will be registered from */
const ATTACK_RADIUS = 50;

// @Cleanup: Messy as fuck
export function processPlayerDataPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
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
   const angularVelocity = reader.readNumber();

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

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const hotbarLimbInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);

   const transformComponent = TransformComponentArray.getComponent(player);
   // If the player has moved or rotated, is is dirty
   if (positionX !== transformComponent.position.x || positionY !== transformComponent.position.y || rotation !== transformComponent.rotation) {
      registerDirtyEntity(player);
   }
   transformComponent.position.x = positionX;
   transformComponent.position.y = positionY;
   transformComponent.rotation = rotation;

   // playerClient.visibleChunkBounds = [minVisibleChunkX, maxVisibleChunkX, minVisibleChunkY, maxVisibleChunkY];
   playerClient.screenWidth = screenWidth;
   playerClient.screenHeight = screenHeight;
   playerClient.visibleChunkBounds = playerClient.getVisibleChunkBounds(transformComponent.position, screenWidth, screenHeight);
   playerClient.gameDataOptions = gameDataOptions;
   
   const physicsComponent = PhysicsComponentArray.getComponent(player);
   physicsComponent.hitboxesAreDirty = true;
   
   physicsComponent.selfVelocity.x = selfVelocityX;
   physicsComponent.selfVelocity.y = selfVelocityY;
   physicsComponent.externalVelocity.x = externalVelocityX;
   physicsComponent.externalVelocity.y = externalVelocityY;
   physicsComponent.acceleration.x = accelerationX;
   physicsComponent.acceleration.y = accelerationY;
   physicsComponent.angularVelocity = angularVelocity;
   
   if (selectedHotbarItemSlot !== hotbarLimbInfo.selectedItemSlot) {
      hotbarLimbInfo.selectedItemSlot = selectedHotbarItemSlot;
      registerDirtyEntity(player);
   }

   const playerComponent = PlayerComponentArray.getComponent(player);
   playerComponent.interactingEntityID = interactingEntityID;

   // @Bug: won't work for using medicine in offhand
   let overrideOffhand = false;
   
   if (mainAction === LimbAction.chargeSpear && hotbarLimbInfo.action !== LimbAction.chargeSpear) {
      startChargingSpear(playerClient.instance, InventoryName.hotbar);
   } else if (mainAction === LimbAction.chargeBattleaxe && hotbarLimbInfo.action !== LimbAction.chargeBattleaxe) {
      startChargingBattleaxe(playerClient.instance, InventoryName.hotbar);
   }

   if (!overrideOffhand) {
      const tribeComponent = TribeComponentArray.getComponent(player);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         const offhandLimbInfo = inventoryUseComponent.getLimbInfo(InventoryName.offhand);

         if (offhandAction === LimbAction.chargeSpear && offhandLimbInfo.action !== LimbAction.chargeSpear) {
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
   if (!entityExists(player)) {
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
   if (!entityExists(player)) {
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
   let layer: Layer;
   if (playerClient.tribe.totem !== null) {
      const totemTransformComponent = TransformComponentArray.getComponent(playerClient.tribe.totem);
      spawnPosition = totemTransformComponent.position.copy();
      const offsetDirection = 2 * Math.PI * Math.random();
      spawnPosition.x += 100 * Math.sin(offsetDirection);
      spawnPosition.y += 100 * Math.cos(offsetDirection);
      layer = getEntityLayer(playerClient.tribe.totem);
   } else {
      spawnPosition = generatePlayerSpawnPosition(playerClient.tribe.tribeType);
      layer = surfaceLayer;
   }

   const config = createPlayerConfig();
   config[ServerComponentType.transform].position.x = spawnPosition.x;
   config[ServerComponentType.transform].position.y = spawnPosition.y;
   config[ServerComponentType.tribe].tribe = playerClient.tribe;
   config[ServerComponentType.player].username = playerClient.username;
   const player = createEntityFromConfig(config, layer);

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

export function processStartItemUsePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.getItem(itemSlot);
   if (item === null) {
      return;
   }

   // Block with the item if possible
   const attackInfo = getItemAttackInfo(item.type);
   if (attackInfo.attackTimings.blockTimeTicks !== null) {
      const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
      const limbInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);

      // @Cleanup: unneeded?
      limbInfo.selectedItemSlot = itemSlot;
      
      // Begin blocking
      limbInfo.action = LimbAction.engageBlock;
      limbInfo.currentActionElapsedTicks = 0;
      limbInfo.currentActionDurationTicks = attackInfo.attackTimings.blockTimeTicks;
      limbInfo.currentActionRate = 1;
      limbInfo.blockBox.hasBlocked = false;
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   
   switch (ITEM_TYPE_RECORD[item.type]) {
      case "healing": {
         // Reset the food timer so that the food isn't immediately eaten
         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         limb.foodEatingTimer = itemInfo.consumeTime;
   
         // @Incomplete
         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            setLimbActions(inventoryUseComponent, LimbAction.useMedicine);
         }
         
         limb.action = LimbAction.eat;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionRate = 1;
         break;
      }
      case "bow": {
         for (let i = 0; i < 2; i++) {
            const limb = inventoryUseComponent.getLimbInfo(i === 0 ? InventoryName.hotbar : InventoryName.offhand);
            limb.action = LimbAction.chargeBow;
            limb.currentActionElapsedTicks = 0;
            limb.currentActionDurationTicks = (ITEM_INFO_RECORD[item.type] as BowItemInfo).shotChargeTimeTicks;
            limb.currentActionRate = 1;
         }
         break;
      }
   }
}

export function processUseItemPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const itemSlot = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   const item = hotbarInventory.itemSlots[itemSlot];
   if (typeof item !== "undefined")  {
      useItem(playerClient.instance, item, InventoryName.hotbar, itemSlot);
   }
}

export function processStopItemUsePacket(playerClient: PlayerClient): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const limb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   // If the limb isn't using an item, stop
   if (limb.action === LimbAction.none) {
      return;
   }

   // If the limb was blocking, deactivate the block box
   if (limb.action === LimbAction.block) {
      // @Copynpaste
      const heldItem = getHeldItem(limb);
      const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
      
      const hasBlocked = limb.blockBox.hasBlocked;
      
      limb.blockBox.isActive = false;
      limb.action = LimbAction.returnBlockToRest;
      limb.currentActionElapsedTicks = 0;
      // @Temporary? Perhaps use separate blockReturnTimeTicks.
      limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.blockTimeTicks!;
      limb.currentActionRate = hasBlocked ? 2 : 1;
   } else {
      limb.action = LimbAction.none;
   }

   registerDirtyEntity(player);
}

export function processItemDropPacket(playerClient: PlayerClient, reader: PacketReader): void {
   if (!entityExists(playerClient.instance)) {
      return;
   }

   const isOffhand = reader.readBoolean();
   reader.padOffset(3);
   const itemSlot = reader.readNumber();
   const dropAmount = reader.readNumber();
   const throwDirection = reader.readNumber();

   const inventoryName = isOffhand ? InventoryName.offhand : InventoryName.hotbar;
   throwItem(playerClient.instance, inventoryName, itemSlot, dropAmount, throwDirection);
}

export function processItemPickupPacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as EntityID;
   if (!entityExists(entity)) {
      return;
   }
   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const amount = reader.readNumber();
   
   const playerInventoryComponent = InventoryComponentArray.getComponent(player);
   const heldItemInventory = getInventory(playerInventoryComponent, InventoryName.heldItemSlot);
   
   // Don't pick up the item if there is already a held item
   if (typeof heldItemInventory.itemSlots[1] !== "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);
   const targetInventory = getInventory(targetInventoryComponent, inventoryName);

   const pickedUpItem = targetInventory.itemSlots[itemSlot];
   if (typeof pickedUpItem === "undefined") {
      return;
   }

   // Remove the item from its previous inventory
   const amountConsumed = consumeItemFromSlot(targetInventory, itemSlot, amount);

   // Hold the item
   // Copy it as the consumeItemFromSlot function modifies the original item's count
   const heldItem = createItem(pickedUpItem.type, amountConsumed);
   heldItemInventory.addItem(heldItem, 1);
}

export function processItemReleasePacket(playerClient: PlayerClient, reader: PacketReader): void {
   const player = playerClient.instance;
   if (!entityExists(player)) {
      return;
   }

   const entity = reader.readNumber() as EntityID;
   if (!entityExists(entity)) {
      return;
   }
   const inventoryName = reader.readNumber() as InventoryName;
   const itemSlot = reader.readNumber();
   const amount = reader.readNumber();

   const inventoryComponent = InventoryComponentArray.getComponent(player);
   
   // Don't release an item if there is no held item
   const heldItemInventory = getInventory(inventoryComponent, InventoryName.heldItemSlot);
   const heldItem = heldItemInventory.itemSlots[1];
   if (typeof heldItem === "undefined") {
      return;
   }

   const targetInventoryComponent = InventoryComponentArray.getComponent(entity);

   // Add the item to the inventory
   const amountAdded = addItemToSlot(targetInventoryComponent, inventoryName, itemSlot, heldItem.type, amount);

   // If all of the item was added, clear the held item
   consumeItemTypeFromInventory(inventoryComponent, InventoryName.heldItemSlot, heldItem.type, amountAdded);
}