import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { Entity, EntityType, EntityTypeString, LimbAction, PlantedEntityType } from "battletribes-shared/entities";
import { Point, rotatePoint } from "battletribes-shared/utils";
import { consumeItemFromSlot, consumeItemType, countItemType, getInventory, InventoryComponentArray, InventoryComponent } from "../../components/InventoryComponent";
import { getCurrentLimbState, getLimbConfiguration, getLimbStateOffset, InventoryUseComponent, InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { TunnelComponentArray, updateTunnelDoorBitset } from "../../components/TunnelComponent";
import { PlanterBoxComponentArray, fertilisePlanterBox, placePlantInPlanterBox } from "../../components/PlanterBoxComponent";
import { HutComponentArray } from "../../components/HutComponent";
import { SpikesComponentArray } from "../../components/SpikesComponent";
import { InventoryName, ItemType, QUIVER_ACCESS_TIME_TICKS, QUIVER_PULL_TIME_TICKS } from "battletribes-shared/items/items";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { HitboxCollisionType, HitboxFlag } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { entityExists, getEntityType, getGameTicks } from "../../world";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeMemberComponent } from "../../components/TribeMemberComponent";
import { PlayerComponent } from "../../components/PlayerComponent";
import { TRIBE_INFO_RECORD, TribeType } from "battletribes-shared/tribes";
import PlayerClient from "../../server/PlayerClient";
import { TribesmanComponent } from "../../components/TribesmanComponent";
import { Hitbox } from "../../hitboxes";
import { LimbConfiguration, LimbState, QUIVER_PULL_LIMB_STATE, RESTING_LIMB_STATES } from "../../../../shared/src/attack-patterns";

// @COPYNPASTE a rare triple!!!!
const BOW_HOLDING_LIMB_STATE: LimbState = {
   direction: 0,
   extraOffset: 36,
   angle: -Math.PI * 0.4,
   extraOffsetX: 4,
   extraOffsetY: 0
};

const getHitboxRadius = (tribeType: TribeType): number => {
   switch (tribeType) {
      case TribeType.barbarians:
      case TribeType.frostlings:
      case TribeType.goblins:
      case TribeType.plainspeople: {
         return 32;
      }
      case TribeType.dwarves: {
         return 28;
      }
   }
}

export function createPlayerConfig(position: Point, angle: number, tribe: Tribe, playerClient: PlayerClient): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.traction = 1.4;

   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, getHitboxRadius(tribe.tribeType)), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);

   const humanoidRadius = (bodyHitbox.box as CircularBox).radius;

   // The hands
   for (let i = 0; i < 2; i++) {
      const limbConfiguration = LimbConfiguration.twoHanded;
      const limbState = RESTING_LIMB_STATES[limbConfiguration];
      
      const isFlipped = i === 1;

      const offset = getLimbStateOffset(limbState, humanoidRadius);

      const handPosition = position.copy();
      handPosition.add(rotatePoint(offset, angle));
      
      // @HACK SQUEAM: the collision mask, so that the player can mine berries for a horse archer shot
      const hitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(handPosition, offset, 0, 12), 0.125, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.planterBox, [HitboxFlag.HAND]);
      hitbox.box.flipX = isFlipped;
      // @Hack
      hitbox.box.totalFlipXMultiplier = isFlipped ? -1 : 1;
      addHitboxToTransformComponent(transformComponent, hitbox);
   }

   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];
   const healthComponent = new HealthComponent(tribeInfo.maxHealthPlayer);

   const statusEffectComponent = new StatusEffectComponent(0);

   const tribeComponent = new TribeComponent(tribe);

   const tribeMemberComponent = new TribeMemberComponent(playerClient.username);

   const tribesmanComponent = new TribesmanComponent();

   const playerComponent = new PlayerComponent(playerClient);
   
   const inventoryComponent = new InventoryComponent();

   const inventoryUseComponent = new InventoryUseComponent();

   return {
      entityType: EntityType.player,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.tribeMember]: tribeMemberComponent,
         [ServerComponentType.tribesman]: tribesmanComponent,
         [ServerComponentType.player]: playerComponent,
         [ServerComponentType.inventory]: inventoryComponent,
         [ServerComponentType.inventoryUse]: inventoryUseComponent
      },
      lights: []
   };
}

// @Cleanup: ton of copy and paste between these functions
// @Cleanup: none of these should be in the player entity creation file

export function startChargingBow(player: Entity): void {
   // @COPYNPASTE from the place in the tribesman combat ai which charges the bow

   
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   
   const hotbarLimb = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   const holdingLimb = hotbarLimb;

   const startHoldingLimbState = getCurrentLimbState(holdingLimb);
   
   holdingLimb.action = LimbAction.engageBow;
   holdingLimb.currentActionElapsedTicks = 0;
   holdingLimb.currentActionDurationTicks = QUIVER_ACCESS_TIME_TICKS + QUIVER_PULL_TIME_TICKS;
   holdingLimb.currentActionRate = 1;
   holdingLimb.currentActionStartLimbState = startHoldingLimbState;
   holdingLimb.currentActionEndLimbState = BOW_HOLDING_LIMB_STATE;

   // Meanwhile the drawing limb pulls an arrow out
   
   const drawingLimb = inventoryUseComponent.getLimbInfo(InventoryName.offhand);
   const startDrawingLimbState = getCurrentLimbState(drawingLimb);
   
   drawingLimb.action = LimbAction.moveLimbToQuiver;
   drawingLimb.currentActionElapsedTicks = 0;
   drawingLimb.currentActionDurationTicks = QUIVER_ACCESS_TIME_TICKS;
   drawingLimb.currentActionRate = 1;
   drawingLimb.currentActionStartLimbState = startDrawingLimbState;
   drawingLimb.currentActionEndLimbState = QUIVER_PULL_LIMB_STATE;
}

export function startChargingSpear(player: Entity, inventoryName: InventoryName): void {
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

export function startChargingBattleaxe(player: Entity, inventoryName: InventoryName): void {
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

const modifyTunnel = (player: Entity, tunnel: Entity): void => {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel);
   if (tunnelComponent.doorBitset !== 0b00 && tunnelComponent.doorBitset !== 0b01 && tunnelComponent.doorBitset !== 0b10) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player);
   if (countItemType(inventoryComponent, ItemType.wood) < 2) {
      return;
   }

   consumeItemType(player, inventoryComponent, ItemType.wood, 2);
   
   switch (tunnelComponent.doorBitset) {
      case 0b00: {
         const playerTransformComponent = TransformComponentArray.getComponent(player);
         const playerHitbox = playerTransformComponent.hitboxes[0];
         
         const tunnelTransformComponent = TransformComponentArray.getComponent(tunnel);
         const tunnelHitbox = tunnelTransformComponent.hitboxes[0];
         
         // Place the door blueprint on whichever side is closest to the player
         const dirToPlayer = tunnelHitbox.box.position.angleTo(playerHitbox.box.position);
         const dot = Math.sin(tunnelHitbox.box.angle) * Math.sin(dirToPlayer) + Math.cos(tunnelHitbox.box.relativeAngle) * Math.cos(dirToPlayer);

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

const modifyHut = (hut: Entity): void => {
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

const modifySpikes = (player: Entity, spikes: Entity): void => {
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

   consumeItemType(player, inventoryComponent, ItemType.leaf, 5);

   spikesComponent.isCovered = true;
}

const modifyPlanterBox = (player: Entity, planterBox: Entity, plantedEntityType: PlantedEntityType): void => {
   // Don't place plant if there's already a plant
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox);
   if (planterBoxComponent.plant !== null && entityExists(planterBoxComponent.plant)) {
      return;
   }
   
   placePlantInPlanterBox(planterBox, plantedEntityType);

   // Consume the item

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player);
   const inventoryComponent = InventoryComponentArray.getComponent(player);

   const hotbarUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.hotbar);
   const hotbarInventory = getInventory(inventoryComponent, InventoryName.hotbar);

   consumeItemFromSlot(player, hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
}

export function modifyBuilding(player: Entity, structure: Entity, data: number): void {
   const structureEntityType = getEntityType(structure);
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

            consumeItemFromSlot(player, hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
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