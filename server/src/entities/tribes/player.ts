import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityID, EntityType, EntityTypeString, LimbAction } from "webgl-test-shared/dist/entities";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point } from "webgl-test-shared/dist/utils";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { onTribeMemberHurt, tickTribeMember } from "./tribe-member";
import { consumeItemFromSlot, consumeItemType, countItemType, getInventory, pickupItemEntity, InventoryComponentArray } from "../../components/InventoryComponent";
import Board from "../../Board";
import { InventoryUseComponentArray, setLimbActions } from "../../components/InventoryUseComponent";
import { TribeComponentArray } from "../../components/TribeComponent";
import { TunnelComponentArray, updateTunnelDoorBitset } from "../../components/TunnelComponent";
import { PlanterBoxComponentArray, fertilisePlanterBox, placePlantInPlanterBox } from "../../components/PlanterBoxComponent";
import { registerPlayerDroppedItemPickup } from "../../server/player-clients";
import { HutComponentArray } from "../../components/HutComponent";
import { SpikesComponentArray } from "../../components/SpikesComponent";
import { InventoryName, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, BowItemInfo, ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.player
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse;

export function createPlayerConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.player,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(1.25, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 32)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: 0
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.tribeMember]: {
         tribeType: TribeType.plainspeople,
         entityType: EntityType.player
      },
      [ServerComponentType.player]: {
         username: ""
      },
      [ServerComponentType.inventory]: {
         inventories: []
      },
      [ServerComponentType.inventoryUse]: {
         usedInventoryNames: []
      }
   };
}

export function onPlayerCollision(player: EntityID, collidingEntity: EntityID): void {
   if (Board.getEntityType(collidingEntity) === EntityType.itemEntity) {
      const wasPickedUp = pickupItemEntity(player, collidingEntity);
      if (wasPickedUp) {
         registerPlayerDroppedItemPickup(player);
      }
   }
}

export function onPlayerHurt(player: EntityID, attackingEntity: EntityID): void {
   onTribeMemberHurt(player, attackingEntity);
}

// @Cleanup: ton of copy and paste between these functions

export function startEating(player: EntityID, inventoryName: InventoryName): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const useInfo = inventoryUseComponent.getUseInfo(inventoryName);
   const inventory = getInventory(inventoryComponent, inventoryName);
   
   const foodItem = inventory.itemSlots[useInfo.selectedItemSlot];
   
   // Reset the food timer so that the food isn't immediately eaten
   if (typeof foodItem !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[foodItem.type] as ConsumableItemInfo;
      useInfo.foodEatingTimer = itemInfo.consumeTime;

      if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
         setLimbActions(inventoryUseComponent, LimbAction.useMedicine);
         return true;
      }
   }
   
   useInfo.action = LimbAction.eat;
   return false;
}

export function startChargingBow(player: EntityID, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const bow = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the bow doesn't fire immediately
   if (typeof bow !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[bow.type] as BowItemInfo;
      useInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;
      useInfo.lastBowChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBow;
}

export function startChargingSpear(player: EntityID, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const spear = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof spear !== "undefined") {
      useInfo.lastSpearChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeSpear;
}

export function startChargingBattleaxe(player: EntityID, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const battleaxe = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof battleaxe !== "undefined") {
      useInfo.lastBattleaxeChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBattleaxe;
}

const modifyTunnel = (player: EntityID, tunnel: EntityID): void => {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel);
   if (tunnelComponent.doorBitset !== 0b00 && tunnelComponent.doorBitset !== 0b01 && tunnelComponent.doorBitset !== 0b10) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   if (countItemType(inventoryComponent, ItemType.wood) < 2) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.wood, 2);
   
   switch (tunnelComponent.doorBitset) {
      case 0b00: {
         const playerTransformComponent = TransformComponentArray.getComponent(player);
         const tunnelTransformComponent = TransformComponentArray.getComponent(tunnel);
         
         // Place the door blueprint on whichever side is closest to the player
         const dirToPlayer = tunnelTransformComponent.position.calculateAngleBetween(playerTransformComponent.position);
         const dot = Math.sin(tunnelTransformComponent.rotation) * Math.sin(dirToPlayer) + Math.cos(tunnelTransformComponent.rotation) * Math.cos(dirToPlayer);

         if (dot > 0) {
            // Top door
            updateTunnelDoorBitset(tunnel, 0b01);
         } else {
            // Bottom door
            updateTunnelDoorBitset(tunnel, 0b10);
         }
         break;
      }
      case 0b10:
      case 0b01: {
         // One door is already placed, so place the other one
         updateTunnelDoorBitset(tunnel, 0b11);
         break;
      }
   }
}

const modifyHut = (hut: EntityID): void => {
   const hutComponent = HutComponentArray.getComponent(hut);

   if (!hutComponent.isRecalling) {
      // Start recall
      hutComponent.isRecalling = true;
   } else {
      // Stop recall

      // If the tribesman is already recalled into the hut, spawn a new one
      if (!hutComponent.hasSpawnedTribesman && hutComponent.hasTribesman) {
         const tribeComponent = TribeComponentArray.getComponent(hut);
         tribeComponent.tribe.createNewTribesman(hut);
      }
         
      hutComponent.isRecalling = false;
   }
}

const modifySpikes = (player: EntityID, spikes: EntityID): void => {
   const spikesComponent = SpikesComponentArray.getComponent(spikes);
   
   // Can only cover non-covered floor spikes
   const entityType = Board.getEntityType(spikes);
   if (spikesComponent.isCovered || entityType === EntityType.wallSpikes || entityType === EntityType.wallPunjiSticks) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   if (countItemType(inventoryComponent, ItemType.leaf) < 5) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.leaf, 5);

   spikesComponent.isCovered = true;
}

const modifyPlanterBox = (player: EntityID, planterBox: EntityID, plantType: PlanterBoxPlant): void => {
   // Don't place plant if there's already a plant
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox);
   if (Board.hasEntity(planterBoxComponent.plantEntity)) {
      return;
   }
   
   placePlantInPlanterBox(planterBox, plantType);

   // Consume the item

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const inventoryComponent = InventoryComponentArray.getComponent(player);

   const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
}

export function modifyBuilding(player: EntityID, structure: EntityID, data: number): void {
   const structureEntityType = Board.getEntityType(structure)!;
   switch (structureEntityType) {
      case EntityType.tunnel: {
         modifyTunnel(player, structure);
         break;
      }
      case EntityType.workerHut:
      case EntityType.warriorHut: {
         modifyHut(structure);
         break;
      }
      case EntityType.floorSpikes:
      case EntityType.wallSpikes:
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks: {
         modifySpikes(player, structure);
         break;
      }
      case EntityType.planterBox: {
         if (data === -1) {
            const planterBoxComponent = PlanterBoxComponentArray.getComponent(structure);
            fertilisePlanterBox(planterBoxComponent);

            // Consume the item
            // @Cleanup: copy and paste
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
            const inventoryComponent = InventoryComponentArray.getComponent(player);

            const hotbarUseInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);
            const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

            consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
         } else {
            modifyPlanterBox(player, structure, data);
         }
         break;
      }
      default: {
         console.warn("Don't know how to modify building of type " + EntityTypeString[structureEntityType]);
         break;
      }
   }
}