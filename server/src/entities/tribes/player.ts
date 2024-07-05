import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType, EntityTypeString, LimbAction } from "webgl-test-shared/dist/entities";
import { TRIBE_INFO_RECORD } from "webgl-test-shared/dist/tribes";
import { Point } from "webgl-test-shared/dist/utils";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import Entity from "../../Entity";
import { onTribeMemberHurt, tickTribeMember } from "./tribe-member";
import Tribe from "../../Tribe";
import { InventoryComponent, consumeItemFromSlot, consumeItemType, countItemType, getInventory, pickupItemEntity, InventoryComponentArray } from "../../components/InventoryComponent";
import Board from "../../Board";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryUseComponent, InventoryUseComponentArray, getInventoryUseInfo, setLimbActions } from "../../components/InventoryUseComponent";
import { TribeMemberComponent, TribeMemberComponentArray, awardTitle } from "../../components/TribeMemberComponent";
import { PlayerComponent, PlayerComponentArray } from "../../components/PlayerComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { PhysicsComponent, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { TunnelComponentArray, updateTunnelDoorBitset } from "../../components/TunnelComponent";
import { PlanterBoxComponentArray, fertilisePlanterBox, placePlantInPlanterBox } from "../../components/PlanterBoxComponent";
import { StructureComponentArray, isAttachedToWall } from "../../components/StructureComponent";
import { registerPlayerDroppedItemPickup } from "../../server/player-clients";
import { HutComponentArray } from "../../components/HutComponent";
import { SpikesComponentArray } from "../../components/SpikesComponent";
import { InventoryName, ITEM_INFO_RECORD, ConsumableItemInfo, ConsumableItemCategory, BowItemInfo, ItemType } from "webgl-test-shared/dist/items/items";
import { ComponentRecord } from "../../components";

export function createPlayer(position: Point, tribe: Tribe, username: string): Entity {
   const player = new Entity(position, 0, EntityType.player, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitbox = new CircularHitbox(1.25, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 32);
   player.addHitbox(hitbox);

   const tribeInfo = TRIBE_INFO_RECORD[tribe.tribeType];

   const physicsComponent = new PhysicsComponent(0, 0, 0, 0, true, false);
   PhysicsComponentArray.addComponent(player.id, physicsComponent);

   const healthComponent = new HealthComponent(tribeInfo.maxHealthPlayer);
   HealthComponentArray.addComponent(player.id, healthComponent);

   const statusEffectComponent = new StatusEffectComponent(0);
   StatusEffectComponentArray.addComponent(player.id, statusEffectComponent);

   const tribeComponent = new TribeComponent(tribe);
   TribeComponentArray.addComponent(player.id, tribeComponent);

   const tribeMemberComponent = new TribeMemberComponent(tribe.tribeType, EntityType.player);
   TribeMemberComponentArray.addComponent(player.id, tribeMemberComponent);

   const playerComponent = new PlayerComponent(username);
   PlayerComponentArray.addComponent(player.id, playerComponent);

   const inventoryUseComponent = new InventoryUseComponent();
   InventoryUseComponentArray.addComponent(player.id, inventoryUseComponent);

   const inventoryComponent = new InventoryComponent();
   InventoryComponentArray.addComponent(player.id, inventoryComponent);

   // @Temporary
   // addItem(inventoryComponent, createItem(ItemType.gardening_gloves, 1));
   // addItem(inventoryComponent, createItem(ItemType.gathering_gloves, 1));
   // addItem(inventoryComponent, createItem(ItemType.wooden_spikes, 5));
   // addItem(inventoryComponent, createItem(ItemType.leaf, 10));

   // setTimeout (() => {
   //    addItem(inventoryComponent, createItem(ItemType.planter_box, 5));
   //    addItem(inventoryComponent, createItem(ItemType.berry, 10));
   //    addItem(inventoryComponent, createItem(ItemType.fertiliser, 10));
   // }, 200);
   // addItem(inventoryComponent, createItem(ItemType.seed, 10));
   // addItem(inventoryComponent, createItem(ItemType.frostcicle, 10));

   // setTimeout(() => {
   //    addItem(inventoryComponent, createItem(ItemType.frostshaper, 99));
   //    addItem(inventoryComponent, createItem(ItemType.stonecarvingTable, 5));
   // }, 50);
   // addItem(inventoryComponent, createItem(ItemType.wood, 10));
   // addItem(inventoryComponent, createItem(ItemType.wooden_wall, 50));

   const componentRecord: ComponentRecord = {
      [ServerComponentType.physics]: physicsComponent,
      [ServerComponentType.health]: healthComponent,
      [ServerComponentType.statusEffect]: statusEffectComponent,
      [ServerComponentType.tribe]: tribeComponent,
      [ServerComponentType.tribeMember]: tribeMemberComponent,
      [ServerComponentType.player]: playerComponent,
      [ServerComponentType.inventoryUse]: inventoryUseComponent,
      [ServerComponentType.inventory]: inventoryComponent
   };

   // @Hack @Copynpaste
   TribeMemberComponentArray.onInitialise!(player, componentRecord);
   
   return player;
}

export function tickPlayer(player: Entity): void {
   tickTribeMember(player);
}

export function onPlayerCollision(player: Entity, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.itemEntity) {
      const wasPickedUp = pickupItemEntity(player.id, collidingEntity);
      if (wasPickedUp) {
         registerPlayerDroppedItemPickup(player);
      }
   }
}

export function onPlayerHurt(player: Entity, attackingEntityID: number): void {
   onTribeMemberHurt(player, attackingEntityID);
}

// @Cleanup: ton of copy and paste between these functions

export function startEating(player: Entity, inventoryName: InventoryName): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);
   
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

export function startChargingBow(player: Entity, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

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

export function startChargingSpear(player: Entity, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const spear = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof spear !== "undefined") {
      useInfo.lastSpearChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeSpear;
}

export function startChargingBattleaxe(player: Entity, inventoryName: InventoryName): void {
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   const inventory = getInventory(inventoryComponent, inventoryName);
   const battleaxe = inventory.itemSlots[useInfo.selectedItemSlot];

   // Reset the cooldown so the battleaxe doesn't fire immediately
   if (typeof battleaxe !== "undefined") {
      useInfo.lastBattleaxeChargeTicks = Board.ticks;
   }
   
   useInfo.action = LimbAction.chargeBattleaxe;
}

const modifyTunnel = (player: Entity, tunnel: Entity): void => {
   const tunnelComponent = TunnelComponentArray.getComponent(tunnel.id);
   if (tunnelComponent.doorBitset !== 0b00 && tunnelComponent.doorBitset !== 0b01 && tunnelComponent.doorBitset !== 0b10) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   if (countItemType(inventoryComponent, ItemType.wood) < 2) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.wood, 2);
   
   switch (tunnelComponent.doorBitset) {
      case 0b00: {
         // Place the door blueprint on whichever side is closest to the player
         const dirToPlayer = tunnel.position.calculateAngleBetween(player.position);
         const dot = Math.sin(tunnel.rotation) * Math.sin(dirToPlayer) + Math.cos(tunnel.rotation) * Math.cos(dirToPlayer);

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
   const hutComponent = HutComponentArray.getComponent(hut.id);

   if (!hutComponent.isRecalling) {
      // Start recall
      hutComponent.isRecalling = true;
   } else {
      // Stop recall

      // If the tribesman is already recalled into the hut, spawn a new one
      if (!hutComponent.hasSpawnedTribesman && hutComponent.hasTribesman) {
         const tribeComponent = TribeComponentArray.getComponent(hut.id);
         tribeComponent.tribe.createNewTribesman(hut);
      }
         
      hutComponent.isRecalling = false;
   }
}

const modifySpikes = (player: Entity, spikes: Entity): void => {
   const spikesComponent = SpikesComponentArray.getComponent(spikes.id);
   const structureComponent = StructureComponentArray.getComponent(spikes.id);
   
   // Can only cover non-covered floor spikes
   if (spikesComponent.isCovered || isAttachedToWall(structureComponent)) {
      return;
   }
   
   const inventoryComponent = InventoryComponentArray.getComponent(player.id);
   if (countItemType(inventoryComponent, ItemType.leaf) < 5) {
      return;
   }

   consumeItemType(inventoryComponent, ItemType.leaf, 5);

   spikesComponent.isCovered = true;
}

const modifyPlanterBox = (player: Entity, planterBox: Entity, plantType: PlanterBoxPlant): void => {
   // Don't place plant if there's already a plant
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox.id);
   if (typeof Board.entityRecord[planterBoxComponent.plantEntityID] !== "undefined") {
      return;
   }
   
   placePlantInPlanterBox(planterBox, plantType);

   // Consume the item
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
   const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
   const hotbarInventory = hotbarUseInfo.inventory;

   consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
}

export function modifyBuilding(player: Entity, buildingID: number, data: number): void {
   const building = Board.entityRecord[buildingID];
   if (typeof building === "undefined") {
      return;
   }

   switch (building.type) {
      case EntityType.tunnel: {
         modifyTunnel(player, building);
         break;
      }
      case EntityType.workerHut:
      case EntityType.warriorHut: {
         modifyHut(building);
         break;
      }
      case EntityType.floorSpikes:
      case EntityType.wallSpikes:
      case EntityType.floorPunjiSticks:
      case EntityType.wallPunjiSticks: {
         modifySpikes(player, building);
         break;
      }
      case EntityType.planterBox: {
         if (data === -1) {
            const planterBoxComponent = PlanterBoxComponentArray.getComponent(buildingID);
            fertilisePlanterBox(planterBoxComponent);

            // Consume the item
            // @Cleanup: copy and paste
            const inventoryUseComponent = InventoryUseComponentArray.getComponent(player.id);
            const hotbarUseInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
            const hotbarInventory = hotbarUseInfo.inventory;
            consumeItemFromSlot(hotbarInventory, hotbarUseInfo.selectedItemSlot, 1);
         } else {
            modifyPlanterBox(player, building, data);
         }
         break;
      }
      default: {
         console.warn("Don't know how to modify building of type " + EntityTypeString[building.type]);
         break;
      }
   }
}