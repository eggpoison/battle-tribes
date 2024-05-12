import { HitFlags } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision-detection";
import { PlanterBoxPlant, BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP } from "webgl-test-shared/dist/components";
import { CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType, LimbAction, PlayerCauseOfDeath, GenericArrowType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { PlaceableItemType, ItemType, Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BattleaxeItemInfo, SwordItemInfo, AxeItemInfo, ToolItemInfo, HammerItemInfo, ConsumableItemInfo, BowItemInfo, itemIsStackable, getItemStackSize, BackpackItemInfo, ArmourItemInfo } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { StructureType, STRUCTURE_TYPES } from "webgl-test-shared/dist/structures";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, lerp } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Board from "../../Board";
import { BerryBushComponentArray, BuildingMaterialComponentArray, HealthComponentArray, InventoryComponentArray, InventoryUseComponentArray, ItemComponentArray, PlantComponentArray, SpikesComponentArray, TreeComponentArray, TribeComponentArray, TribeMemberComponentArray, TribesmanComponentArray } from "../../components/ComponentArray";
import { addItemToSlot, consumeItemFromSlot, consumeItemType, countItemType, getInventory, getItem, getItemFromInventory, inventoryHasItemInSlot, pickupItemEntity, removeItemFromInventory, resizeInventory } from "../../components/InventoryComponent";
import { getEntitiesInRange } from "../../ai-shared";
import { addDefence, damageEntity, healEntity, removeDefence } from "../../components/HealthComponent";
import { WORKBENCH_SIZE, createWorkbench } from "../workbench";
import { TRIBE_TOTEM_SIZE, createTribeTotem } from "./tribe-totem";
import { WORKER_HUT_SIZE, createWorkerHut } from "./worker-hut";
import { applyStatusEffect } from "../../components/StatusEffectComponent";
import { BARREL_SIZE, createBarrel } from "./barrel";
import { CAMPFIRE_SIZE, createCampfire } from "../cooking-entities/campfire";
import { FURNACE_SIZE, createFurnace } from "../cooking-entities/furnace";
import { GenericArrowInfo, createWoodenArrow } from "../projectiles/wooden-arrow";
import { onFishLeaderHurt } from "../mobs/fish";
import { createSpearProjectile } from "../projectiles/spear-projectile";
import { createResearchBench } from "../research-bench";
import { createWarriorHut } from "./warrior-hut";
import { createWall } from "../buildings/wall";
import { InventoryUseInfo, getInventoryUseInfo } from "../../components/InventoryUseComponent";
import { createBattleaxeProjectile } from "../projectiles/battleaxe-projectile";
import { SERVER } from "../../server";
import { createPlanterBox } from "../buildings/planter-box";
import { createIceArrow } from "../projectiles/ice-arrow";
import { createSpikes } from "../buildings/spikes";
import { createPunjiSticks } from "../buildings/punji-sticks";
import { doBlueprintWork } from "../../components/BlueprintComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { createBlueprintEntity } from "../blueprint-entity";
import { getItemAttackCooldown } from "../../items";
import { applyKnockback } from "../../components/PhysicsComponent";
import Tribe from "../../Tribe";
import { entityIsResource } from "./tribesman-ai/tribesman-resource-gathering";
import { adjustTribesmanRelationsAfterGift } from "../../components/TribesmanComponent";
import { TITLE_REWARD_CHANCES } from "../../tribesman-title-generation";
import { awardTitle, hasTitle } from "../../components/TribeMemberComponent";
import { createHealingTotem } from "../buildings/healing-totem";
import { TREE_RADII } from "../resources/tree";
import { BERRY_BUSH_RADIUS, dropBerry } from "../resources/berry-bush";
import { createItemEntity } from "../item-entity";
import { dropBerryBushCropBerries } from "../plant";
import { createFence } from "../buildings/fence";
import { createFenceGate } from "../buildings/fence-gate";
import { createBuildingHitboxes } from "../../buildings";
import { getHitboxesCollidingEntities } from "../../collision";
import { FenceConnectionComponentArray, addFenceConnection } from "../../components/FenceConnectionComponent";

const enum Vars {
   ITEM_THROW_FORCE = 100,
   ITEM_THROW_OFFSET = 32
}

interface PotentialSnapPosition {
   readonly position: Point;
   readonly sideBit: number;
   readonly i: number;
}

/** 1st bit = top, 2nd bit = right, 3rd bit = bottom, 4th bit = left */
export type ConnectedSidesBitset = number;
export type ConnectedEntityIDs = [number, number, number, number];

interface BuildingSnapInfo {
   /** -1 if no snap was found */
   readonly x: number;
   readonly y: number;
   readonly rotation: number;
   readonly entityType: StructureType;
   readonly connectedSidesBitset: ConnectedSidesBitset;
   readonly connectedEntityIDs: ConnectedEntityIDs;
}

const DEFAULT_ATTACK_KNOCKBACK = 125;

const SWORD_DAMAGEABLE_ENTITIES: ReadonlyArray<EntityType> = [EntityType.zombie, EntityType.krumblid, EntityType.cactus, EntityType.tribeWorker, EntityType.tribeWarrior, EntityType.player, EntityType.yeti, EntityType.frozenYeti, EntityType.berryBush, EntityType.fish, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.cow, EntityType.golem, EntityType.slime, EntityType.slimewisp];
const PICKAXE_DAMAGEABLE_ENTITIES: ReadonlyArray<EntityType> = [EntityType.boulder, EntityType.tombstone, EntityType.iceSpikes, EntityType.furnace, EntityType.golem];
const AXE_DAMAGEABLE_ENTITIES: ReadonlyArray<EntityType> = [EntityType.tree, EntityType.wall, EntityType.door, EntityType.embrasure, EntityType.researchBench, EntityType.workbench, EntityType.floorSpikes, EntityType.wallSpikes, EntityType.floorPunjiSticks, EntityType.wallPunjiSticks, EntityType.tribeTotem, EntityType.workerHut, EntityType.warriorHut, EntityType.barrel];

// @Cleanup: Copy and paste. This placeable entity stuff is shared between server and client

enum PlaceableItemHitboxType {
   circular = 0,
   rectangular = 1
}

interface PlaceableItemHitboxInfo {
   readonly entityType: StructureType;
   readonly type: PlaceableItemHitboxType;
   readonly placeOffset: number;
}

interface PlaceableItemCircularHitboxInfo extends PlaceableItemHitboxInfo {
   readonly type: PlaceableItemHitboxType.circular;
   readonly radius: number;
}

interface PlaceableItemRectangularHitboxInfo extends PlaceableItemHitboxInfo {
   readonly type: PlaceableItemHitboxType.rectangular;
   readonly width: number;
   readonly height: number;
}

// @Cleanup: Shared between both client and server
const PLACEABLE_ITEM_HITBOX_INFO: Record<PlaceableItemType, PlaceableItemCircularHitboxInfo | PlaceableItemRectangularHitboxInfo> = {
   [ItemType.workbench]: {
      entityType: EntityType.workbench,
      type: PlaceableItemHitboxType.rectangular,
      width: WORKBENCH_SIZE,
      height: WORKBENCH_SIZE,
      placeOffset: WORKBENCH_SIZE / 2
   },
   [ItemType.tribe_totem]: {
      entityType: EntityType.tribeTotem,
      type: PlaceableItemHitboxType.circular,
      radius: TRIBE_TOTEM_SIZE / 2,
      placeOffset: TRIBE_TOTEM_SIZE / 2
   },
   [ItemType.worker_hut]: {
      entityType: EntityType.workerHut,
      type: PlaceableItemHitboxType.rectangular,
      width: WORKER_HUT_SIZE,
      height: WORKER_HUT_SIZE,
      placeOffset: WORKER_HUT_SIZE / 2
   },
   [ItemType.barrel]: {
      entityType: EntityType.barrel,
      type: PlaceableItemHitboxType.circular,
      radius: BARREL_SIZE / 2,
      placeOffset: BARREL_SIZE / 2
   },
   [ItemType.campfire]: {
      entityType: EntityType.campfire,
      type: PlaceableItemHitboxType.rectangular,
      width: CAMPFIRE_SIZE,
      height: CAMPFIRE_SIZE,
      placeOffset: CAMPFIRE_SIZE / 2
   },
   [ItemType.furnace]: {
      entityType: EntityType.furnace,
      type: PlaceableItemHitboxType.rectangular,
      width: FURNACE_SIZE,
      height: FURNACE_SIZE,
      placeOffset: FURNACE_SIZE / 2
   },
   [ItemType.research_bench]: {
      entityType: EntityType.researchBench,
      type: PlaceableItemHitboxType.rectangular,
      width: 32 * 4,
      height: 20 * 4,
      placeOffset: 50
   },
   [ItemType.wooden_wall]: {
      entityType: EntityType.wall,
      type: PlaceableItemHitboxType.rectangular,
      width: 64,
      height: 64,
      placeOffset: 32
   },
   [ItemType.planter_box]: {
      entityType: EntityType.planterBox,
      type: PlaceableItemHitboxType.rectangular,
      width: 80,
      height: 80,
      placeOffset: 40
   },
   [ItemType.wooden_spikes]: {
      entityType: EntityType.floorSpikes,
      type: PlaceableItemHitboxType.rectangular,
      width: 48,
      height: 48,
      placeOffset: 20
   },
   [ItemType.punji_sticks]: {
      entityType: EntityType.floorPunjiSticks,
      type: PlaceableItemHitboxType.rectangular,
      width: 48,
      height: 48,
      placeOffset: 20
   },
   [ItemType.ballista]: {
      entityType: EntityType.ballista,
      type: PlaceableItemHitboxType.rectangular,
      width: 100,
      height: 100,
      placeOffset: 50
   },
   [ItemType.sling_turret]: {
      entityType: EntityType.slingTurret,
      type: PlaceableItemHitboxType.circular,
      radius: 36,
      placeOffset: 36
   },
   [ItemType.healing_totem]: {
      entityType: EntityType.healingTotem,
      type: PlaceableItemHitboxType.circular,
      radius: 48,
      placeOffset: 48
   },
   [ItemType.wooden_fence]: {
      entityType: EntityType.fence,
      type: PlaceableItemHitboxType.rectangular,
      width: 64,
      height: 16,
      placeOffset: 8
   }
};

function assertItemTypeIsPlaceable(itemType: ItemType): asserts itemType is PlaceableItemType {
   if (!PLACEABLE_ITEM_HITBOX_INFO.hasOwnProperty(itemType)) {
      throw new Error(`Entity type '${itemType}' is not placeable.`);
   }
}

const getDamageMultiplier = (entity: Entity): number => {
   let multiplier = 1;

   if (TribeMemberComponentArray.hasComponent(entity.id)) {
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity.id);

      for (let i = 0; i < tribeMemberComponent.titles.length; i++) {
         const title = tribeMemberComponent.titles[i].title;

         switch (title) {
            case TribesmanTitle.deathbringer: {
               multiplier *= 1.15;
               break;
            }
         }
      }
   }

   return multiplier;
}

export function calculateItemDamage(entity: Entity, item: Item | null, entityToAttack: Entity): number {
   let baseItemDamage: number;
   if (item === null) {
      baseItemDamage = 1;
   } else {
      const itemCategory = ITEM_TYPE_RECORD[item.type];
      switch (itemCategory) {
         case "battleaxe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as BattleaxeItemInfo;
            if (SWORD_DAMAGEABLE_ENTITIES.includes(entityToAttack.type) || AXE_DAMAGEABLE_ENTITIES.includes(entityToAttack.type)) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "spear":
         case "sword": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as SwordItemInfo;
            if (SWORD_DAMAGEABLE_ENTITIES.includes(entityToAttack.type)) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "axe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as AxeItemInfo;
            if (AXE_DAMAGEABLE_ENTITIES.includes(entityToAttack.type)) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.ceil(itemInfo.damage / 3);
            }
            break;
         }
         case "pickaxe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as AxeItemInfo;
            if (PICKAXE_DAMAGEABLE_ENTITIES.includes(entityToAttack.type)) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.floor(itemInfo.damage / 4);
            }
            break;
         }
         default: {
            baseItemDamage = 1;
         }
      }
   }

   return baseItemDamage * getDamageMultiplier(entity);
}

const calculateItemKnockback = (item: Item | null): number => {
   if (item === null) {
      return DEFAULT_ATTACK_KNOCKBACK;
   }

   const itemInfo = ITEM_INFO_RECORD[item.type];
   if (itemInfo.hasOwnProperty("toolType")) {
      return (itemInfo as ToolItemInfo).knockback;
   }

   return DEFAULT_ATTACK_KNOCKBACK;
}

const getRepairTimeMultiplier = (tribeMember: Entity): number => {
   if (tribeMember.type === EntityType.tribeWarrior) {
      return 2;
   }
   return 1;
}

// @Cleanup: Maybe split this up into repair and work functions
export function repairBuilding(tribeMember: Entity, targetEntity: Entity, itemSlot: number, inventoryName: string): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Don't attack if on cooldown or not doing another action
   if (useInfo.itemAttackCooldowns.hasOwnProperty(itemSlot) || useInfo.action !== LimbAction.none) {
      return false;
   }
   
   // Find the selected item
   const item = getItem(inventoryComponent, inventoryName, itemSlot);
   if (item === null) {
      console.warn("Tried to repair a building without a hammer!");
      return false;
   }

   // Reset attack cooldown
   const baseAttackCooldown = item !== null ? getItemAttackCooldown(item) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const attackCooldown = baseAttackCooldown * getRepairTimeMultiplier(tribeMember);
   useInfo.itemAttackCooldowns[itemSlot] = attackCooldown;
   useInfo.lastAttackCooldown = attackCooldown;

   // @Incomplete: Should this instead be its own lastConstructTicks?
   useInfo.lastAttackTicks = Board.ticks;

   if (targetEntity.type === EntityType.blueprintEntity) {
      // If holding a hammer and attacking a friendly blueprint, work on the blueprint instead of damaging it
      const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
      const blueprintTribeComponent = TribeComponentArray.getComponent(targetEntity.id);
      if (blueprintTribeComponent.tribe === tribeComponent.tribe) {
         doBlueprintWork(targetEntity, item);
         return true;
      }
   } else if (STRUCTURE_TYPES.includes(targetEntity.type as StructureType)) {
      // Heal friendly structures
      const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
      const buildingTribeComponent = TribeComponentArray.getComponent(targetEntity.id);
      if (buildingTribeComponent.tribe === tribeComponent.tribe) {
         const itemInfo = ITEM_INFO_RECORD[item.type] as HammerItemInfo;
         healEntity(targetEntity, itemInfo.repairAmount, tribeMember.id);
         return true;
      }
   }

   console.warn("Couldn't repair/build the entity: not a blueprint or in STRUCTURE_TYPES.")
   return false;
}

const getSwingTimeMulitplier = (entity: Entity, targetEntity: Entity): number => {
   let swingTimeMultiplier = 1;

   if (TribeComponentArray.hasComponent(entity.id)) {
      // Barbarians swing 30% slower
      const tribeComponent = TribeComponentArray.getComponent(entity.id);
      if (tribeComponent.tribe.type === TribeType.barbarians) {
         swingTimeMultiplier /= 0.7;
      }
   
      // Warriors attack resources slower
      if (entity.type === EntityType.tribeWarrior && entityIsResource(targetEntity)) {
         swingTimeMultiplier *= 2.5;
      }
   }

   return swingTimeMultiplier;
   
}

const isBerryBushWithBerries = (entity: Entity): boolean => {
   switch (entity.type) {
      case EntityType.berryBush: {
         const berryBushComponent = BerryBushComponentArray.getComponent(entity.id);
         return berryBushComponent.numBerries > 0;
      }
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity.id);
         return plantComponent.plantType === PlanterBoxPlant.berryBush && plantComponent.numFruit > 0;
      }
      default: {
         return false;
      }
   }
}

const gatherPlant = (plant: Entity, attacker: Entity): void => {
   if (isBerryBushWithBerries(plant)) {
      if (plant.type === EntityType.berryBush) {
         dropBerry(plant, attacker);
      } else {
         dropBerryBushCropBerries(plant, attacker);
      }
   } else {
      let plantRadius: number;
      switch (plant.type) {
         case EntityType.tree: {
            const treeComponent = TreeComponentArray.getComponent(plant.id);
            plantRadius = TREE_RADII[treeComponent.treeSize];
            break;
         }
         case EntityType.berryBush: {
            plantRadius = BERRY_BUSH_RADIUS;
            break;
         }
         case EntityType.plant: {
            plantRadius = 10;
            break;
         }
         default: {
            throw new Error();
         }
      }
   
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = plant.position.x + (plantRadius - 7) * Math.sin(offsetDirection);
      const y = plant.position.y + (plantRadius - 7) * Math.cos(offsetDirection);
   
      createItemEntity(new Point(x, y), ItemType.leaf, 1, 0);
   }

   SERVER.registerEntityHit({
      entityPositionX: plant.position.x,
      entityPositionY: plant.position.y,
      hitEntityID: plant.id,
      damage: 0,
      knockback: 0,
      angleFromAttacker: plant.position.calculateAngleBetween(attacker.position),
      attackerID: attacker.id,
      flags: HitFlags.NON_DAMAGING_HIT
   });
}

/**
 * @param targetEntity The entity to attack
 * @param itemSlot The item slot being used to attack the entity
 * @returns Whether or not the attack succeeded
 */
// @Cleanup: (?) Pass in the item to use directly instead of passing in the item slot and inventory name
// @Cleanup: Not just for tribe members, move to different file
export function attemptAttack(attacker: Entity, targetEntity: Entity, itemSlot: number, inventoryName: string): boolean {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(attacker.id);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      return false;
   }

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Don't attack if on cooldown or not doing another action
   if (useInfo.itemAttackCooldowns.hasOwnProperty(itemSlot) || useInfo.extraAttackCooldownTicks > 0 || useInfo.action !== LimbAction.none) {
      return false;
   }
   
   // Find the selected item
   const inventoryComponent = InventoryComponentArray.getComponent(attacker.id);
   let item = getItem(inventoryComponent, inventoryName, itemSlot);
   
   if (item !== null && useInfo.thrownBattleaxeItemID === item.id) {
      item = null;
   }

   // Reset attack cooldown
   const baseAttackCooldown = item !== null ? getItemAttackCooldown(item) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const attackCooldown = baseAttackCooldown * getSwingTimeMulitplier(attacker, targetEntity);
   useInfo.itemAttackCooldowns[itemSlot] = attackCooldown;
   useInfo.lastAttackCooldown = attackCooldown;
   useInfo.lastAttackTicks = Board.ticks;
   if (attacker.type !== EntityType.player) {
      inventoryUseComponent.globalAttackCooldown = Settings.GLOBAL_ATTACK_COOLDOWN;
   }

   // @Cleanup @Speed: Make a function (e.g. attemptTribesmanAttack) which does this check using the return val of attemptTack
   if (attacker.type === EntityType.tribeWorker) {
      useInfo.extraAttackCooldownTicks = Math.floor(0.1 * Settings.TPS);
   }

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((item === null || item.type === ItemType.leaf) && (targetEntity.type === EntityType.tree || targetEntity.type === EntityType.berryBush || targetEntity.type === EntityType.plant)) {
      const glove = getItem(inventoryComponent, "gloveSlot", 1);
      if (glove !== null && (glove.type === ItemType.gathering_gloves || glove.type === ItemType.gardening_gloves)) {
         gatherPlant(targetEntity, attacker);
         return true;
      }
   }

   const attackDamage = calculateItemDamage(attacker, item, targetEntity);
   const attackKnockback = calculateItemKnockback(item);

   const hitDirection = attacker.position.calculateAngleBetween(targetEntity.position);

   // Register the hit
   damageEntity(targetEntity, attackDamage, attacker, PlayerCauseOfDeath.tribe_member);
   applyKnockback(targetEntity, attackKnockback, hitDirection);
   SERVER.registerEntityHit({
      entityPositionX: targetEntity.position.x,
      entityPositionY: targetEntity.position.y,
      hitEntityID: targetEntity.id,
      damage: attackDamage,
      knockback: attackKnockback,
      angleFromAttacker: hitDirection,
      attackerID: attacker.id,
      flags: item !== null && item.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0
   });

   if (item !== null && item.type === ItemType.flesh_sword) {
      applyStatusEffect(targetEntity.id, StatusEffect.poisoned, 3 * Settings.TPS);
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attacker.id, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(targetEntity.id, StatusEffect.bleeding, 2 * Settings.TPS);
   }

   return true;
}

const getEntityAttackPriority = (entityType: EntityType): number => {
   switch (entityType) {
      case EntityType.planterBox: return 0;
      default: return 1;
   }
}

// @Cleanup: Not just for tribe members, move to different file
export function calculateAttackTarget(tribeMember: Entity, targetEntities: ReadonlyArray<Entity>, attackableEntityRelationshipMask: number): Entity | null {
   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   let maxAttackPriority = 0;
   for (const targetEntity of targetEntities) {
      // Don't attack entities without health components
      if (!HealthComponentArray.hasComponent(targetEntity.id)) {
         continue;
      }

      const relationship = getEntityRelationship(tribeMember.id, targetEntity);
      if ((relationship & attackableEntityRelationshipMask) === 0) {
         continue;
      }

      const attackPriority = getEntityAttackPriority(targetEntity.type);
      const dist = tribeMember.position.calculateDistanceBetween(targetEntity.position);

      if (attackPriority > maxAttackPriority) {
         minDistance = dist;
         maxAttackPriority = attackPriority;
         closestEntity = targetEntity;
      } else if (dist < minDistance) {
         closestEntity = targetEntity;
         minDistance = dist;
      }
   }
   
   if (closestEntity === null) return null;

   return closestEntity;
}


export function calculateRepairTarget(tribeMember: Entity, targetEntities: ReadonlyArray<Entity>): Entity | null {
   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const targetEntity of targetEntities) {
      // Don't attack entities without health components
      if (!HealthComponentArray.hasComponent(targetEntity.id)) {
         continue;
      }

      // Only repair damaged buildings
      const healthComponent = HealthComponentArray.getComponent(targetEntity.id);
      if (healthComponent.health === healthComponent.maxHealth) {
         continue;
      }

      const relationship = getEntityRelationship(tribeMember.id, targetEntity);
      if (relationship !== EntityRelationship.friendlyBuilding) {
         continue;
      }

      const dist = tribeMember.position.calculateDistanceBetween(targetEntity.position);
      if (dist < minDistance) {
         closestEntity = targetEntity;
         minDistance = dist;
      }
   }
   
   if (closestEntity === null) return null;

   return closestEntity;
}


export function calculateBlueprintWorkTarget(tribeMember: Entity, targetEntities: ReadonlyArray<Entity>): Entity | null {
   let closestEntity: Entity | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const targetEntity of targetEntities) {
      // Don't attack entities without health components
      if (targetEntity.type !== EntityType.blueprintEntity) {
         continue;
      }

      const dist = tribeMember.position.calculateDistanceBetween(targetEntity.position);
      if (dist < minDistance) {
         closestEntity = targetEntity;
         minDistance = dist;
      }
   }
   
   if (closestEntity === null) return null;

   return closestEntity;
}

// @Cleanup: Rename function. shouldn't be 'attack'
// @Cleanup: Not just for tribe members, move to different file
export function calculateRadialAttackTargets(entity: Entity, attackOffset: number, attackRadius: number): ReadonlyArray<Entity> {
   const attackPositionX = entity.position.x + attackOffset * Math.sin(entity.rotation);
   const attackPositionY = entity.position.y + attackOffset * Math.cos(entity.rotation);
   const attackedEntities = getEntitiesInRange(attackPositionX, attackPositionY, attackRadius);
   
   // Don't attack yourself
   while (true) {
      const idx = attackedEntities.indexOf(entity);
      if (idx !== -1) {
         attackedEntities.splice(idx, 1);
      } else {
         break;
      }
   }

   return attackedEntities;
}

const calculateRegularPlacePosition = (entity: Entity, placeInfo: PlaceableItemHitboxInfo): Point => {
   const placePositionX = entity.position.x + (Settings.ITEM_PLACE_DISTANCE + placeInfo.placeOffset) * Math.sin(entity.rotation);
   const placePositionY = entity.position.y + (Settings.ITEM_PLACE_DISTANCE + placeInfo.placeOffset) * Math.cos(entity.rotation);
   return new Point(placePositionX, placePositionY);
}

const entityIsPlacedOnWall = (entity: Entity): boolean => {
   return entity.type === EntityType.wallSpikes || entity.type === EntityType.wallPunjiSticks;
}

const calculateStructureSnapPositions = (snapOrigin: Point, snapEntity: Entity, placeRotation: number, isPlacedOnWall: boolean, placeInfo: PlaceableItemHitboxInfo): ReadonlyArray<Point> => {
   const snapPositions = new Array<Point>();
   for (let i = 0; i < 4; i++) {
      const direction = i * Math.PI / 2 + snapEntity.rotation;
      let snapEntityOffset: number = 0;
      if (i % 2 === 0) {
         // Top and bottom snap positions
         // snapEntityOffset = getSnapOffsetHeight(snapEntity.type as unknown as StructureType, entityIsPlacedOnWall(snapEntity)) * 0.5;
      } else {
         // Left and right snap positions
         // snapEntityOffset = getSnapOffsetWidth(snapEntity.type as unknown as StructureType, entityIsPlacedOnWall(snapEntity)) * 0.5;
      }

      const epsilon = 0.01; // @Speed: const enum?
      let structureOffsetI = i;
      // If placing on the left or right side of the snap entity, use the width offset
      if (!(Math.abs(direction - placeRotation) < epsilon || Math.abs(direction - (placeRotation + Math.PI)) < epsilon)) {
         structureOffsetI++;
      }

      let structureOffset: number = 0;
      if (structureOffsetI % 2 === 0 || (isPlacedOnWall && (placeInfo.entityType === EntityType.floorSpikes || placeInfo.entityType === EntityType.floorPunjiSticks))) {
         // Top and bottom
         // structureOffset = getSnapOffsetHeight(placeInfo.entityType as StructureType, isPlacedOnWall) * 0.5;
      } else {
         // Left and right
         // structureOffset = getSnapOffsetWidth(placeInfo.entityType as StructureType, isPlacedOnWall) * 0.5;
      }

      const offset = snapEntityOffset + structureOffset;
      const positionX = snapOrigin.x + offset * Math.sin(direction);
      const positionY = snapOrigin.y + offset * Math.cos(direction);
      snapPositions.push(new Point(positionX, positionY));
   }

   return snapPositions;
}

const calculateStructureSnapPosition = (snapPositions: ReadonlyArray<Point>, regularPlacePosition: Point): PotentialSnapPosition | null => {
   // @Incomplete: position can never be null
   
   let minDist = Settings.STRUCTURE_POSITION_SNAP;
   let closestPosition: PotentialSnapPosition | null = null;
   for (let i = 0; i < 4; i++) {
      const position = snapPositions[i];

      const snapDistance = position.calculateDistanceBetween(regularPlacePosition);
      if (snapDistance < minDist) {
         const oppositeI = (i + 2) % 4;

         minDist = snapDistance;
         closestPosition = {
            position: position,
            sideBit: 1 << oppositeI,
            i: oppositeI
         };
      }
   }

   return closestPosition;
}

export function calculateSnapInfo(entity: Entity, placeInfo: PlaceableItemHitboxInfo): BuildingSnapInfo | null {
   const regularPlacePosition = calculateRegularPlacePosition(entity, placeInfo);

   const minChunkX = Math.max(Math.floor((regularPlacePosition.x - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((regularPlacePosition.x + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((regularPlacePosition.y - Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((regularPlacePosition.y + Settings.STRUCTURE_SNAP_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   
   const snappableEntities = new Array<Entity>();
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const currentEntity of chunk.entities) {
            const distance = regularPlacePosition.calculateDistanceBetween(currentEntity.position);
            // @Cleanup: need?
            if (distance > Settings.STRUCTURE_SNAP_RANGE) {
               continue;
            }
            
            if (STRUCTURE_TYPES.includes(currentEntity.type as StructureType)) {
               snappableEntities.push(currentEntity);
            }
         }
      }
   }

   for (const snapEntity of snappableEntities) {
      const snapOrigin = snapEntity.position.copy();
      if (snapEntity.type === EntityType.embrasure) {
         snapOrigin.x -= 22 * Math.sin(snapEntity.rotation);
         snapOrigin.y -= 22 * Math.cos(snapEntity.rotation);
      }

      const isPlacedOnWall = snapEntity.type === EntityType.wall;

      // @Cleanup
      let clampedSnapRotation = snapEntity.rotation;
      while (clampedSnapRotation >= Math.PI * 0.25) {
         clampedSnapRotation -= Math.PI * 0.5;
      }
      while (clampedSnapRotation < Math.PI * 0.25) {
         clampedSnapRotation += Math.PI * 0.5;
      }
      const placeRotation = Math.round(entity.rotation / (Math.PI * 0.5)) * Math.PI * 0.5 + clampedSnapRotation;

      const snapPositions = calculateStructureSnapPositions(snapOrigin, snapEntity, placeRotation, isPlacedOnWall, placeInfo);
      const snapPosition = calculateStructureSnapPosition(snapPositions, regularPlacePosition);
      if (snapPosition !== null) {
         // @incomplete
         // @Hack
         let finalPlaceRotation = placeRotation;
         // if (isPlacedOnWall && (placeInfo.entityType === EntityType.spikes || placeInfo.entityType === EntityType.punjiSticks)) {
         if (isPlacedOnWall) {
            finalPlaceRotation = snapEntity.position.calculateAngleBetween(snapPosition.position);
         } else if (placeInfo.entityType === EntityType.fence) {
            finalPlaceRotation = snapEntity.rotation;
         }

         const connectedEntityIDs: ConnectedEntityIDs = [0, 0, 0, 0];
         connectedEntityIDs[snapPosition.i] = snapEntity.id;

         return {
            x: snapPosition.position.x,
            y: snapPosition.position.y,
            rotation: finalPlaceRotation,
            entityType: placeInfo.entityType,
            connectedSidesBitset: snapPosition.sideBit,
            connectedEntityIDs: connectedEntityIDs
         };
      }
   }
   
   return null;
}

const calculatePlacePosition = (entity: Entity, placeInfo: PlaceableItemHitboxInfo, snapInfo: BuildingSnapInfo | null): Point => {
   if (snapInfo === null) {
      return calculateRegularPlacePosition(entity, placeInfo);
   }

   return new Point(snapInfo.x, snapInfo.y);
}

const calculatePlaceRotation = (entity: Entity, snapInfo: BuildingSnapInfo | null): number => {
   if (snapInfo === null) {
      return entity.rotation;
   }

   return snapInfo.rotation;
}

const buildingCanBePlaced = (x: number, y: number, rotation: number, entityType: StructureType): boolean => {
   // @Incomplete: doesn't account for wall/floor spikes
   const testHitboxes = createBuildingHitboxes(entityType, x, y, 1, rotation);
   const collidingEntities = getHitboxesCollidingEntities(testHitboxes);

   for (let i = 0; i < collidingEntities.length; i++) {
      const entity = collidingEntities[i];

      if (entity.type !== EntityType.itemEntity) {
         return false;
      }
   }
   return true;
}

const getAttachedWallID = (connectedEntityIDs: ConnectedEntityIDs): number => {
   for (let i = 0; i < connectedEntityIDs.length; i++) {
      const entityID = connectedEntityIDs[i];
      if (entityID !== 0) {
         return entityID;
      }
   }
   return 0;
}

export function placeBuilding(tribe: Tribe, position: Point, rotation: number, entityType: StructureType, connectedSidesBitset: ConnectedSidesBitset, connectedEntityIDs: ConnectedEntityIDs): void {
   // Spawn the placeable entity
   switch (entityType) {
      case EntityType.workbench: createWorkbench(position, rotation, tribe); break;
      case EntityType.tribeTotem: createTribeTotem(position, rotation, tribe); break;
      case EntityType.workerHut: createWorkerHut(position, rotation, tribe); break;
      case EntityType.warriorHut: createWarriorHut(position, rotation, tribe); break;
      case EntityType.barrel: createBarrel(position, rotation, tribe); break;
      case EntityType.campfire: createCampfire(position, rotation, tribe); break;
      case EntityType.furnace: createFurnace(position, rotation, tribe); break;
      case EntityType.researchBench: createResearchBench(position, rotation, tribe); break;
      case EntityType.wall: createWall(position, rotation, tribe); break;
      case EntityType.planterBox: createPlanterBox(position, rotation, tribe); break;
      case EntityType.floorSpikes: createSpikes(position, rotation, tribe, getAttachedWallID(connectedEntityIDs)); break;
      case EntityType.floorPunjiSticks: createPunjiSticks(position, rotation, tribe, getAttachedWallID(connectedEntityIDs)); break;
      case EntityType.ballista: createBlueprintEntity(position, rotation, BlueprintType.ballista, 0, tribe); break;
      case EntityType.slingTurret: createBlueprintEntity(position, rotation, BlueprintType.slingTurret, 0, tribe); break;
      case EntityType.healingTotem: createHealingTotem(position, rotation, tribe); break;
      case EntityType.fence: createFence(position, rotation, tribe, connectedSidesBitset, connectedEntityIDs); break;
      case EntityType.fenceGate: createFenceGate(position, rotation, tribe, connectedSidesBitset, connectedEntityIDs); break;
      case EntityType.wallSpikes:
      case EntityType.wallPunjiSticks:
      case EntityType.embrasure:
      case EntityType.tunnel:
      case EntityType.door: {
         console.warn("Can't place entity of type " + EntityTypeString[entityType]);
         break;
      }
      default: {
         const _unreachable: never = entityType;
         return _unreachable;
      }
   }
}

export function useItem(tribeMember: Entity, item: Item, inventoryName: string, itemSlot: number): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);

   // @Cleanup: Extract each one of these cases into their own function

   switch (itemCategory) {
      case "armour": {
         // 
         // Equip the armour
         // 
         
         const targetItem = getItem(inventoryComponent, "armourSlot", 1);
         // If the target item slot has a different item type, don't attempt to transfer
         if (targetItem !== null && targetItem.type !== item.type) {
            return;
         }

         // Move from hotbar to armour slot
         removeItemFromInventory(inventoryComponent, inventoryName, itemSlot);
         addItemToSlot(inventoryComponent, "armourSlot", 1, item.type, 1);
         break;
      }
      case "glove": {
         // 
         // Equip the glove
         // 
         
         const targetItem = getItem(inventoryComponent, "gloveSlot", 1);
         // If the target item slot has a different item type, don't attempt to transfer
         if (targetItem !== null && targetItem.type !== item.type) {
            return;
         }

         // Move from hotbar to glove slot
         removeItemFromInventory(inventoryComponent, inventoryName, itemSlot);
         addItemToSlot(inventoryComponent, "gloveSlot", 1, item.type, 1);
         break;
      }
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(tribeMember.id);

         // Don't use food if already at maximum health
         if (healthComponent.health >= healthComponent.maxHealth) return;

         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;

         healEntity(tribeMember, itemInfo.healAmount, tribeMember.id);
         consumeItemFromSlot(inventoryComponent, inventoryName, itemSlot, 1);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName)
         useInfo.lastEatTicks = Board.ticks;

         if (item.type === ItemType.berry && Math.random() < 0.05) {
            awardTitle(tribeMember, TribesmanTitle.berrymuncher);
         }

         break;
      }
      case "placeable": {
         assertItemTypeIsPlaceable(item.type);

         const placeInfo = PLACEABLE_ITEM_HITBOX_INFO[item.type];

         const snapInfo = calculateSnapInfo(tribeMember, placeInfo);
         const placePosition = calculatePlacePosition(tribeMember, placeInfo, snapInfo);
         const placeRotation = calculatePlaceRotation(tribeMember, snapInfo);

         const placedEntityType = snapInfo !== null ? snapInfo.entityType : placeInfo.entityType;

         // Make sure the placeable item can be placed
         if (!buildingCanBePlaced(placePosition.x, placePosition.y, placeRotation, placedEntityType)) return;
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         placeBuilding(tribeComponent.tribe, placePosition, placeRotation, placedEntityType, snapInfo !== null ? snapInfo.connectedSidesBitset : 0, snapInfo !== null ? snapInfo.connectedEntityIDs : [0, 0, 0, 0]);

         consumeItemFromSlot(inventoryComponent, "hotbar", itemSlot, 1);

         break;
      }
      case "bow": {
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);
         if (useInfo.bowCooldownTicks !== 0) {
            return;
         }

         useInfo.lastBowChargeTicks = Board.ticks;

         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;
         useInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = tribeMember.position.copy();
         const offset = Point.fromVectorForm(35, tribeMember.rotation);
         spawnPosition.add(offset);

         let arrow: Entity;
         switch (item.type) {
            case ItemType.wooden_bow:
            case ItemType.reinforced_bow: {
               const arrowInfo: GenericArrowInfo = {
                  type: GenericArrowType.woodenArrow,
                  damage: itemInfo.projectileDamage,
                  knockback: itemInfo.projectileKnockback,
                  hitboxWidth: 12,
                  hitboxHeight: 64,
                  ignoreFriendlyBuildings: false,
                  statusEffect: null
               }
               arrow = createWoodenArrow(spawnPosition, tribeMember, arrowInfo);
               break;
            }
            case ItemType.ice_bow: {
               const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
               arrow = createIceArrow(spawnPosition, tribeMember.rotation, tribeComponent.tribe);
               break;
            }
            default: {
               throw new Error("No case for bow type " + item.type);
            }
         }

         arrow.velocity.x = itemInfo.projectileSpeed * Math.sin(tribeMember.rotation);
         arrow.velocity.y = itemInfo.projectileSpeed * Math.cos(tribeMember.rotation);
         
         break;
      }
      case "crossbow": {
         // Don't fire if not loaded
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);
         if (!useInfo.crossbowLoadProgressRecord.hasOwnProperty(itemSlot) || useInfo.crossbowLoadProgressRecord[itemSlot] < 1) {
            return;
         }

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = tribeMember.position.copy();
         const offset = Point.fromVectorForm(35, tribeMember.rotation);
         spawnPosition.add(offset);
         
         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;
         // @Copynpaste from bow above
         const arrowInfo: GenericArrowInfo = {
            type: GenericArrowType.woodenArrow,
            damage: itemInfo.projectileDamage,
            knockback: itemInfo.projectileKnockback,
            hitboxWidth: 12,
            hitboxHeight: 64,
            ignoreFriendlyBuildings: false,
            statusEffect: null
         }
         const arrow = createWoodenArrow(spawnPosition, tribeMember, arrowInfo);
         
         arrow.velocity.x = itemInfo.projectileSpeed * Math.sin(tribeMember.rotation);
         arrow.velocity.y = itemInfo.projectileSpeed * Math.cos(tribeMember.rotation);

         delete useInfo.crossbowLoadProgressRecord[itemSlot];
         
         break;
      }
      case "spear": {
         // 
         // Throw the spear
         // 

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

         const offsetDirection = tribeMember.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = tribeMember.position.x + 35 * Math.sin(offsetDirection);
         const y = tribeMember.position.y + 35 * Math.cos(offsetDirection);
         const spear = createSpearProjectile(new Point(x, y), tribeMember.id, item);

         const ticksSinceLastAction = Board.ticks - useInfo.lastSpearChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(1000, 1700, Math.min(secondsSinceLastAction / 3, 1));

         spear.velocity.x = velocityMagnitude * Math.sin(tribeMember.rotation);
         spear.velocity.y = velocityMagnitude * Math.cos(tribeMember.rotation);
         spear.rotation = tribeMember.rotation;

         consumeItemFromSlot(inventoryComponent, inventoryName, itemSlot, 1);

         useInfo.lastSpearChargeTicks = Board.ticks;
         
         break;
      }
      case "battleaxe": {
         // 
         // Throw the battleaxe
         // 

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);

         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

         const offsetDirection = tribeMember.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = tribeMember.position.x + 35 * Math.sin(offsetDirection);
         const y = tribeMember.position.y + 35 * Math.cos(offsetDirection);
         const battleaxe = createBattleaxeProjectile(new Point(x, y), tribeMember.id, item, tribeComponent.tribe);

         const ticksSinceLastAction = Board.ticks - useInfo.lastBattleaxeChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(600, 1100, Math.min(secondsSinceLastAction / 3, 1));

         battleaxe.velocity.x = velocityMagnitude * Math.sin(tribeMember.rotation);
         battleaxe.velocity.y = velocityMagnitude * Math.cos(tribeMember.rotation);
         battleaxe.rotation = tribeMember.rotation;

         // Add velocity from thrower
         battleaxe.velocity.x += tribeMember.velocity.x;
         battleaxe.velocity.y += tribeMember.velocity.y;

         useInfo.lastBattleaxeChargeTicks = Board.ticks;
         useInfo.thrownBattleaxeItemID = item.id;
         
         break;
      }
   }
}

export function tribeMemberCanPickUpItem(tribeMember: Entity, itemType: ItemType): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
   const inventory = getInventory(inventoryComponent, "hotbar");
   
   for (let itemSlot = 1; itemSlot <= inventory.width * inventory.height; itemSlot++) {
      if (!inventory.itemSlots.hasOwnProperty(itemSlot)) {
         return true;
      }

      const item = inventory.itemSlots[itemSlot];
      if (item.type === itemType && itemIsStackable(item.type) && getItemStackSize(item) - item.count > 0) {
         return true;
      }
   }

   return false;
}

const tickInventoryUseInfo = (tribeMember: Entity, inventoryUseInfo: InventoryUseInfo): void => {
   switch (inventoryUseInfo.action) {
      case LimbAction.eat:
      case LimbAction.useMedicine: {
         inventoryUseInfo.foodEatingTimer -= Settings.I_TPS;
   
         if (inventoryUseInfo.foodEatingTimer <= 0 && inventoryHasItemInSlot(inventoryUseInfo.inventory, inventoryUseInfo.selectedItemSlot)) {
            const selectedItem = getItemFromInventory(inventoryUseInfo.inventory, inventoryUseInfo.selectedItemSlot);
            if (selectedItem !== null) {
               const itemCategory = ITEM_TYPE_RECORD[selectedItem.type];
               if (itemCategory === "healing") {
                  useItem(tribeMember, selectedItem, inventoryUseInfo.inventory.name, inventoryUseInfo.selectedItemSlot);
   
                  const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as ConsumableItemInfo;
                  inventoryUseInfo.foodEatingTimer = itemInfo.consumeTime;

                  if (TribesmanComponentArray.hasComponent(tribeMember.id) && Math.random() < TITLE_REWARD_CHANCES.BERRYMUNCHER_REWARD_CHANCE) {
                     awardTitle(tribeMember, TribesmanTitle.berrymuncher);
                  }
               }
            }
         }
         break;
      }
      case LimbAction.loadCrossbow: {
         if (!inventoryUseInfo.crossbowLoadProgressRecord.hasOwnProperty(inventoryUseInfo.selectedItemSlot)) {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] = Settings.I_TPS;
         } else {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] += Settings.I_TPS;
         }
         
         if (inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] >= 1) {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] = 1;
            inventoryUseInfo.action = LimbAction.none;
         }
         
         break;
      }
   }
}

export function tickTribeMember(tribeMember: Entity): void {
   if (tribeMember.velocity.x !== 0 || tribeMember.velocity.y !== 0) {
      const chance = TITLE_REWARD_CHANCES.SPRINTER_REWARD_CHANCE_PER_SPEED * tribeMember.velocity.length();
      if (Math.random() < chance / Settings.TPS) {
         awardTitle(tribeMember, TribesmanTitle.sprinter);
      }
   }

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, "hotbar");
   tickInventoryUseInfo(tribeMember, useInfo);

   const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
   if (tribeComponent.tribe.type === TribeType.barbarians && tribeMember.type !== EntityType.tribeWorker) {
      const useInfo = getInventoryUseInfo(inventoryUseComponent, "offhand");
      tickInventoryUseInfo(tribeMember, useInfo);
   }

   // @Speed: Shouldn't be done every tick, only do when the backpack changes
   // Update backpack
   const backpackSlotInventory = getInventory(inventoryComponent, "backpackSlot");
   if (backpackSlotInventory.itemSlots.hasOwnProperty(1)) {
      const itemInfo = ITEM_INFO_RECORD[backpackSlotInventory.itemSlots[1].type] as BackpackItemInfo;
      resizeInventory(inventoryComponent, "backpack", itemInfo.inventoryWidth, itemInfo.inventoryHeight);
   } else {
      resizeInventory(inventoryComponent, "backpack", -1, -1);
   }
      
   // @Speed: Shouldn't be done every tick, only do when the armour changes
   // Armour defence
   const armourSlotInventory = getInventory(inventoryComponent, "armourSlot");
   const healthComponent = HealthComponentArray.getComponent(tribeMember.id);
   if (armourSlotInventory.itemSlots.hasOwnProperty(1)) {
      const itemInfo = ITEM_INFO_RECORD[armourSlotInventory.itemSlots[1].type] as ArmourItemInfo;
      addDefence(healthComponent, itemInfo.defence, "armour");

      const armour = armourSlotInventory.itemSlots[1];
      if (armour.type === ItemType.leaf_suit) {
         tribeMember.collisionMask &= ~COLLISION_BITS.plants;
      } else {
         tribeMember.collisionMask |= COLLISION_BITS.plants;
      }
   } else {
      removeDefence(healthComponent, "armour");
   }
}

export function onTribeMemberHurt(tribeMember: Entity, attackingEntity: Entity): void {
   const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
   tribeComponent.tribe.addAttackingEntity(attackingEntity.id);
   
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribeMember.id);
   for (let i = 0; i < tribeMemberComponent.fishFollowerIDs.length; i++) {
      const fishID = tribeMemberComponent.fishFollowerIDs[i];
      const fish = Board.entityRecord[fishID]!;
      onFishLeaderHurt(fish, attackingEntity);
   }
}

export function wasTribeMemberKill(attackingEntity: Entity | null): boolean {
   return attackingEntity !== null && (attackingEntity.type === EntityType.player || attackingEntity.type === EntityType.tribeWorker || attackingEntity.type === EntityType.tribeWarrior || attackingEntity.type === EntityType.floorSpikes || attackingEntity.type === EntityType.wallSpikes || attackingEntity.type === EntityType.floorPunjiSticks || attackingEntity.type === EntityType.wallPunjiSticks || attackingEntity.type === EntityType.ballista || attackingEntity.type === EntityType.slingTurret);
}

const blueprintTypeMatchesBuilding = (building: Entity, blueprintType: BlueprintType): boolean => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(building.id);

   if (building.type === EntityType.wall) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWall || blueprintType === BlueprintType.woodenDoor || blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.woodenTunnel;
         case BuildingMaterial.stone: return blueprintType === BlueprintType.stoneDoor || blueprintType === BlueprintType.stoneEmbrasure || blueprintType === BlueprintType.stoneTunnel;
      }
   }

   if (building.type === EntityType.door) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneDoorUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (building.type === EntityType.embrasure) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneEmbrasureUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (building.type === EntityType.tunnel) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneTunnelUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (building.type === EntityType.floorSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneFloorSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (building.type === EntityType.wallSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWallSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (building.type === EntityType.workerHut) {
      return blueprintType === BlueprintType.warriorHutUpgrade;
   }

   if (building.type === EntityType.fence) {
      return blueprintType === BlueprintType.fenceGate;
   }

   return false;
}

export function placeBlueprint(tribeMember: Entity, buildingID: number, blueprintType: BlueprintType, dynamicRotation: number): void {
   const building = Board.entityRecord[buildingID];
   if (typeof building === "undefined") {
      return;
   }

   if (!blueprintTypeMatchesBuilding(building, blueprintType)) {
      return;
   }

   switch (blueprintType) {
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.woodenDoor:
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneTunnel:{
         const position = building.position.copy();
         if (blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.stoneEmbrasure) {
            position.x += 22 * Math.sin(dynamicRotation);
            position.y += 22 * Math.cos(dynamicRotation);
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         createBlueprintEntity(position, dynamicRotation, blueprintType, 0, tribeComponent.tribe);
         
         building.remove();
         break;
      }
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneWall: {
         const materialComponent = BuildingMaterialComponentArray.getComponent(building.id);
         const upgradeMaterialItemType = MATERIAL_TO_ITEM_MAP[(materialComponent.material + 1) as BuildingMaterial];
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
         if (countItemType(inventoryComponent, upgradeMaterialItemType) < 5) {
            return;
         }

         // Upgrade
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         createBlueprintEntity(building.position.copy(), building.rotation, blueprintType, building.id, tribeComponent.tribe);
         
         consumeItemType(inventoryComponent, upgradeMaterialItemType, 5);
         break;
      }
      case BlueprintType.warriorHutUpgrade: {
         // @Cleanup: copy and paste

         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
         if (countItemType(inventoryComponent, ItemType.rock) < 25 || countItemType(inventoryComponent, ItemType.wood) < 15) {
            return;
         }

         // Upgrade
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         createBlueprintEntity(building.position.copy(), building.rotation, blueprintType, building.id, tribeComponent.tribe);

         consumeItemType(inventoryComponent, ItemType.rock, 25);
         consumeItemType(inventoryComponent, ItemType.wood, 15);

         break;
      }
      case BlueprintType.fenceGate: {
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
         if (countItemType(inventoryComponent, ItemType.wood) < 5) {
            return;
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         createBlueprintEntity(building.position.copy(), building.rotation, blueprintType, building.id, tribeComponent.tribe);

         consumeItemType(inventoryComponent, ItemType.wood, 5);
      }
   }
}

export function getAvailableCraftingStations(tribeMember: Entity): ReadonlyArray<CraftingStation> {
   const minChunkX = Math.max(Math.floor((tribeMember.position.x - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribeMember.position.x + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((tribeMember.position.y - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribeMember.position.y + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const availableCraftingStations = new Array<CraftingStation>();

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const distance = tribeMember.position.calculateDistanceBetween(entity.position);
            if (distance > Settings.MAX_CRAFTING_STATION_USE_DISTANCE) {
               continue;
            }

            switch (entity.type) {
               case EntityType.workbench: {
                  if (!availableCraftingStations.includes(CraftingStation.workbench)) {
                     availableCraftingStations.push(CraftingStation.workbench);
                  }
                  break;
               }
               case EntityType.slime: {
                  if (!availableCraftingStations.includes(CraftingStation.slime)) {
                     availableCraftingStations.push(CraftingStation.slime);
                  }
                  break;
               }
            }
         }
      }
   }

   return availableCraftingStations;
}

// @Cleanup: why need 2?

export function onTribeMemberCollision(tribesman: Entity, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.berryBush || collidingEntity.type === EntityType.tree) {
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman.id);
      tribeMemberComponent.lastPlantCollisionTicks = Board.ticks;
   }
}

// @Cleanup: not for player. reflect in function name
export function onTribesmanCollision(tribesman: Entity, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.itemEntity) {
      const itemComponent = ItemComponentArray.getComponent(collidingEntity.id);
      // Keep track of it beforehand as the amount variable gets changed when being picked up
      const itemAmount = itemComponent.amount;

      const wasPickedUp = pickupItemEntity(tribesman, collidingEntity);

      if (wasPickedUp && itemComponent.throwingEntityID !== 0 && itemComponent.throwingEntityID !== tribesman.id) {
         adjustTribesmanRelationsAfterGift(tribesman, itemComponent.throwingEntityID, itemComponent.itemType, itemAmount);
      }
   }
}

export function throwItem(tribesman: Entity, inventoryName: string, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const inventory = getInventory(inventoryComponent, inventoryName);
   if (!inventory.itemSlots.hasOwnProperty(itemSlot)) {
      return;
   }
   
   const itemType = inventory.itemSlots[itemSlot].type;
   const amountRemoved = consumeItemFromSlot(inventoryComponent, inventoryName, itemSlot, dropAmount);

   const dropPosition = tribesman.position.copy();
   dropPosition.x += Vars.ITEM_THROW_OFFSET * Math.sin(throwDirection);
   dropPosition.y += Vars.ITEM_THROW_OFFSET * Math.cos(throwDirection);

   // Create the item entity
   const itemEntity = createItemEntity(dropPosition, itemType, amountRemoved, tribesman.id);

   // Throw the dropped item away from the player
   itemEntity.velocity.x += Vars.ITEM_THROW_FORCE * Math.sin(throwDirection);
   itemEntity.velocity.y += Vars.ITEM_THROW_FORCE * Math.cos(throwDirection);

   itemEntity.velocity.x += tribesman.velocity.x;
   itemEntity.velocity.y += tribesman.velocity.y;

   if (TribesmanComponentArray.hasComponent(tribesman.id)) {
      const tribesmanComponent = TribesmanComponentArray.getComponent(tribesman.id);
      tribesmanComponent.lastItemThrowTicks = Board.ticks;
   }
}

const isBerryBush = (entity: Entity): boolean => {
   switch (entity.type) {
      case EntityType.berryBush: {
         return true;
      }
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity.id);
         return plantComponent.plantType === PlanterBoxPlant.berryBush;
      }
      default: {
         return false;
      }
   }
}

export function getEntityPlantGatherMultiplier(entity: Entity, plant: Entity): number {
   // For when called with non-tribesmen
   if (!TribeMemberComponentArray.hasComponent(entity.id)) {
      return 1;
   }
   
   let multiplier = 1;

   if (hasTitle(entity.id, TribesmanTitle.berrymuncher) && isBerryBush(plant)) {
      multiplier++;
   }

   if (hasTitle(entity.id, TribesmanTitle.gardener)) {
      multiplier++;
   }

   return multiplier;
}