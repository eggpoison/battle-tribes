import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { EntityID, EntityType, EntityTypeString, LimbAction } from "battletribes-shared/entities";
import { TribeType } from "battletribes-shared/tribes";
import { Point } from "battletribes-shared/utils";
import { onTribeMemberHurt } from "./tribe-member";
import { consumeItemFromSlot, consumeItemType, countItemType, getInventory, pickupItemEntity, InventoryComponentArray } from "../../components/InventoryComponent";
import Layer from "../../Layer";
import { InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { TribeComponentArray } from "../../components/TribeComponent";
import { TunnelComponentArray, updateTunnelDoorBitset } from "../../components/TunnelComponent";
import { PlanterBoxComponentArray, fertilisePlanterBox, placePlantInPlanterBox } from "../../components/PlanterBoxComponent";
import { registerPlayerDroppedItemPickup } from "../../server/player-clients";
import { HutComponentArray } from "../../components/HutComponent";
import { SpikesComponentArray } from "../../components/SpikesComponent";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { entityExists, getEntityType, getGameTicks } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.tribe
   | ServerComponentType.tribeMember
   | ServerComponentType.player
   | ServerComponentType.inventory
   | ServerComponentType.inventoryUse
   | ServerComponentType.damageBox;

export function createPlayerConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.player,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, 32), 1.25, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1.4,
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
      },
      [ServerComponentType.damageBox]: {}
   };
}

export function onPlayerCollision(player: EntityID, collidingEntity: EntityID): void {
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
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

export function startChargingBow(player: EntityID, inventoryName: InventoryName): void {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const limb = inventoryUseComponent.getLimbInfo(inventoryName);
   limb.action = LimbAction.chargeBow;
}

export function startChargingSpear(player: EntityID, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const limb = inventoryUseComponent.getLimbInfo(inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const spear = inventory.getItem(limb.selectedItemSlot);
   if (spear === null) {
      return;
   }

   limb.action = LimbAction.chargeSpear;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = 3;
   limb.currentActionRate = 1;
}

export function startChargingBattleaxe(player: EntityID, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);

   const useInfo = inventoryUseComponent.getLimbInfo(inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const battleaxe = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof battleaxe !== "undefined") {
      useInfo.lastBattleaxeChargeTicks = getGameTicks();
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
   const entityType = getEntityType(spikes);
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
   if (entityExists(planterBoxComponent.plantEntity)) {
      return;
   }
   
   placePlantInPlanterBox(planterBox, plantType);

   // Consume the item

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const inventoryComponent = InventoryComponentArray.getComponent(player);

   const hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
}

export function modifyBuilding(player: EntityID, structure: EntityID, data: number): void {
   const structureEntityType = getEntityType(structure)!;
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

            const hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
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