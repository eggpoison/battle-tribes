import { AttackEffectiveness, calculateAttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { HitFlags } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "webgl-test-shared/dist/components";
import { CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { EntityType, LimbAction, PlayerCauseOfDeath, GenericArrowType, EntityTypeString } from "webgl-test-shared/dist/entities";
import { PlaceableItemType, ItemType, Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BattleaxeItemInfo, SwordItemInfo, AxeItemInfo, HammerItemInfo, ConsumableItemInfo, BowItemInfo, itemIsStackable, getItemStackSize, BackpackItemInfo, ArmourItemInfo, InventoryName, ConsumableItemCategory, itemInfoIsTool } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { StructureConnectionInfo, StructureType, calculateStructurePlaceInfo } from "webgl-test-shared/dist/structures";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, dotAngles, lerp } from "webgl-test-shared/dist/utils";
import Entity, { entityIsStructure } from "../../Entity";
import Board from "../../Board";
import { InventoryComponentArray, consumeItemFromSlot, consumeItemType, countItemType, getInventory, inventoryIsFull, pickupItemEntity, resizeInventory } from "../../components/InventoryComponent";
import { getEntitiesInRange } from "../../ai-shared";
import { HealthComponentArray, addDefence, damageEntity, healEntity, removeDefence } from "../../components/HealthComponent";
import { createWorkbench } from "../structures/workbench";
import { createTribeTotem } from "../structures/tribe-totem";
import { createWorkerHut } from "../structures/worker-hut";
import { applyStatusEffect, clearStatusEffects } from "../../components/StatusEffectComponent";
import { createBarrel } from "../structures/barrel";
import { createCampfire } from "../structures/cooking-entities/campfire";
import { createFurnace } from "../structures/cooking-entities/furnace";
import { GenericArrowInfo, createWoodenArrow } from "../projectiles/wooden-arrow";
import { onFishLeaderHurt } from "../mobs/fish";
import { createSpearProjectile } from "../projectiles/spear-projectile";
import { createResearchBench } from "../structures/research-bench";
import { createWarriorHut } from "../structures/warrior-hut";
import { createWall } from "../structures/wall";
import { InventoryUseComponentArray, InventoryUseInfo, getInventoryUseInfo } from "../../components/InventoryUseComponent";
import { createBattleaxeProjectile } from "../projectiles/battleaxe-projectile";
import { createPlanterBox } from "../structures/planter-box";
import { createIceArrow } from "../projectiles/ice-arrow";
import { createSpikes } from "../structures/spikes";
import { createPunjiSticks } from "../structures/punji-sticks";
import { doBlueprintWork } from "../../components/BlueprintComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { createBlueprintEntity } from "../blueprint-entity";
import { getItemAttackCooldown } from "../../items";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import Tribe from "../../Tribe";
import { entityIsResource } from "./tribesman-ai/tribesman-resource-gathering";
import { TribesmanAIComponentArray, adjustTribesmanRelationsAfterGift } from "../../components/TribesmanAIComponent";
import { TITLE_REWARD_CHANCES } from "../../tribesman-title-generation";
import { TribeMemberComponentArray, awardTitle, hasTitle } from "../../components/TribeMemberComponent";
import { createHealingTotem } from "../structures/healing-totem";
import { TREE_RADII } from "../resources/tree";
import { BERRY_BUSH_RADIUS, dropBerry } from "../resources/berry-bush";
import { createItemEntity, itemEntityCanBePickedUp } from "../item-entity";
import { dropBerryBushCropBerries } from "../plant";
import { createFence } from "../structures/fence";
import { createFenceGate } from "../structures/fence-gate";
import { PlantComponentArray, plantIsFullyGrown } from "../../components/PlantComponent";
import { ItemComponentArray } from "../../components/ItemComponent";
import { StructureComponentArray } from "../../components/StructureComponent";
import { TreeComponentArray } from "../../components/TreeComponent";
import { createFrostshaper } from "../structures/frostshaper";
import { createStonecarvingTable } from "../structures/stonecarving-table";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";

const enum Vars {
   ITEM_THROW_FORCE = 100,
   ITEM_THROW_OFFSET = 32
}

/** 1st bit = top, 2nd bit = right, 3rd bit = bottom, 4th bit = left */
export type ConnectedSidesBitset = number;
export type ConnectedEntityIDs = [number, number, number, number];

const DEFAULT_ATTACK_KNOCKBACK = 125;

export const VACUUM_RANGE = 85;
const VACUUM_STRENGTH = 25;

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

export function calculateItemDamage(entity: Entity, item: Item | null, attackEffectiveness: AttackEffectiveness): number {
   if (attackEffectiveness === AttackEffectiveness.stopped) {
      return 0;
   }
   
   let baseItemDamage: number;
   if (item === null) {
      baseItemDamage = 1;
   } else {
      // @Cleanup
      const itemCategory = ITEM_TYPE_RECORD[item.type];
      switch (itemCategory) {
         case "battleaxe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as BattleaxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "spear":
         case "sword": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as SwordItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.floor(itemInfo.damage / 2);
            }
            break;
         }
         case "axe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as AxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
               baseItemDamage = itemInfo.damage;
            } else {
               baseItemDamage = Math.ceil(itemInfo.damage / 3);
            }
            break;
         }
         case "pickaxe": {
            const itemInfo = ITEM_INFO_RECORD[item.type] as AxeItemInfo;
            if (attackEffectiveness === AttackEffectiveness.effective) {
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
   if (itemInfoIsTool(item.type, itemInfo)) {
      return itemInfo.knockback;
   }

   return DEFAULT_ATTACK_KNOCKBACK;
}

const getRepairTimeMultiplier = (tribeMember: Entity): number => {
   let multiplier = 1;
   
   if (tribeMember.type === EntityType.tribeWarrior) {
      multiplier *= 2;
   }

   return multiplier;
}

const getRepairAmount = (tribeMember: Entity, hammerItem: Item): number => {
   const itemInfo = ITEM_INFO_RECORD[hammerItem.type] as HammerItemInfo;
   let repairAmount = itemInfo.repairAmount;

   if (hasTitle(tribeMember.id, TribesmanTitle.builder)) {
      repairAmount *= 1.5;
   }
   
   return Math.round(repairAmount);
}

// @Cleanup: lot of copy and paste from attemptAttack
// @Cleanup: Maybe split this up into repair and work functions
export function repairBuilding(tribeMember: Entity, targetEntity: Entity, itemSlot: number, inventoryName: InventoryName): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Don't attack if on cooldown or not doing another action
   if (typeof useInfo.itemAttackCooldowns[itemSlot] !== "undefined" || useInfo.action !== LimbAction.none) {
      return false;
   }
   
   // Find the selected item
   const inventory = getInventory(inventoryComponent, inventoryName);
   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") {
      console.warn("Tried to repair a building without a hammer!");
      return false;
   }

   // Reset attack cooldown
   const baseAttackCooldown = item !== null ? getItemAttackCooldown(item) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const attackCooldown = baseAttackCooldown * getSwingTimeMultiplier(tribeMember, targetEntity, item) * getRepairTimeMultiplier(tribeMember);
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
   } else if (entityIsStructure(targetEntity)) {
      // Heal friendly structures
      const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
      const buildingTribeComponent = TribeComponentArray.getComponent(targetEntity.id);
      if (buildingTribeComponent.tribe === tribeComponent.tribe) {
         const repairAmount = getRepairAmount(tribeMember, item);
         healEntity(targetEntity, repairAmount, tribeMember.id);
         return true;
      }
   }

   console.warn("Couldn't repair/build the entity: not a blueprint or in STRUCTURE_TYPES.")
   return false;
}

export function getSwingTimeMultiplier(entity: Entity, targetEntity: Entity, item: Item | null): number {
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

   // Builers swing hammers 30% faster
   if (hasTitle(entity.id, TribesmanTitle.builder) && item !== null && ITEM_TYPE_RECORD[item.type] === "hammer") {
      swingTimeMultiplier /= 1.3;
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

const getEntityPlantGatherMultiplier = (tribeman: Entity, plant: Entity, gloves: Item | null): number => {
   let multiplier = 1;

   if (hasTitle(tribeman.id, TribesmanTitle.berrymuncher) && isBerryBush(plant)) {
      multiplier++;
   }

   if (hasTitle(tribeman.id, TribesmanTitle.gardener)) {
      multiplier++;
   }

   if (gloves !== null && gloves.type === ItemType.gardening_gloves) {
      multiplier++;
   }

   return multiplier;
}

const gatherPlant = (plant: Entity, attacker: Entity, gloves: Item | null): void => {
   if (isBerryBushWithBerries(plant)) {
      const gatherMultiplier = getEntityPlantGatherMultiplier(attacker, plant, gloves);

      if (plant.type === EntityType.berryBush) {
         dropBerry(plant, gatherMultiplier);
      } else {
         dropBerryBushCropBerries(plant, gatherMultiplier);
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
   
      createItemEntity(new Point(x, y), 2 * Math.PI * Math.random(), ItemType.leaf, 1, 0);
   }

   // @Hack
   const collisionPoint = new Point((plant.position.x + attacker.position.x) / 2, (plant.position.y + attacker.position.y) / 2);

   damageEntity(plant, attacker, 0, 0, AttackEffectiveness.ineffective, collisionPoint, HitFlags.NON_DAMAGING_HIT);
}

/**
 * @param targetEntity The entity to attack
 * @param itemSlot The item slot being used to attack the entity
 * @returns Whether or not the attack succeeded
 */
// @Cleanup: (?) Pass in the item to use directly instead of passing in the item slot and inventory name
// @Cleanup: Not just for tribe members, move to different file
export function attemptAttack(attacker: Entity, targetEntity: Entity, itemSlot: number, inventoryName: InventoryName): boolean {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(attacker.id);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      return false;
   }

   const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

   // Don't attack if on cooldown or not doing another action
   if (typeof useInfo.itemAttackCooldowns[itemSlot] !== "undefined" || useInfo.extraAttackCooldownTicks > 0 || useInfo.action !== LimbAction.none) {
      return false;
   }
   
   // Find the selected item
   const inventoryComponent = InventoryComponentArray.getComponent(attacker.id);
   const inventory = getInventory(inventoryComponent, inventoryName);
   let item: Item | null | undefined = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined" || useInfo.thrownBattleaxeItemID === item.id) {
      item = null;
   }

   const attackEffectiveness = calculateAttackEffectiveness(item, targetEntity.type);

   // Reset attack cooldown
   // @Hack
   // const baseAttackCooldown = item !== null ? getItemAttackCooldown(item) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const baseAttackCooldown = item !== null ? (item.type === ItemType.gardening_gloves ? 1 : getItemAttackCooldown(item)) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const attackCooldown = baseAttackCooldown * getSwingTimeMultiplier(attacker, targetEntity, item);
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
      const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
      const gloves = gloveInventory.itemSlots[1];
      if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
         gatherPlant(targetEntity, attacker, gloves);
         return true;
      }
   }

   const attackDamage = calculateItemDamage(attacker, item, attackEffectiveness);
   const attackKnockback = calculateItemKnockback(item);

   const hitDirection = attacker.position.calculateAngleBetween(targetEntity.position);

   // @Hack
   const collisionPoint = new Point((targetEntity.position.x + attacker.position.x) / 2, (targetEntity.position.y + attacker.position.y) / 2);

   // Register the hit
   const hitFlags = item !== null && item.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0;
   damageEntity(targetEntity, attacker, attackDamage, PlayerCauseOfDeath.tribe_member, attackEffectiveness, collisionPoint, hitFlags);
   applyKnockback(targetEntity, attackKnockback, hitDirection);

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

      // @Temporary
      if (targetEntity.type === EntityType.plant) {
         const plantComponent = PlantComponentArray.getComponent(targetEntity.id);
         if (!plantIsFullyGrown(plantComponent)) {
            continue;
         }
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
   for (;;) {
      const idx = attackedEntities.indexOf(entity);
      if (idx !== -1) {
         attackedEntities.splice(idx, 1);
      } else {
         break;
      }
   }

   return attackedEntities;
}

export function placeBuilding(tribe: Tribe, position: Point, rotation: number, entityType: StructureType, connectionInfo: StructureConnectionInfo): void {
   // Spawn the placeable entity
   switch (entityType) {
      case EntityType.workbench: createWorkbench(position, rotation, tribe, connectionInfo); break;
      case EntityType.tribeTotem: createTribeTotem(position, rotation, tribe, connectionInfo); break;
      case EntityType.workerHut: createWorkerHut(position, rotation, tribe, connectionInfo); break;
      case EntityType.warriorHut: createWarriorHut(position, rotation, tribe, connectionInfo); break;
      case EntityType.barrel: createBarrel(position, rotation, tribe, connectionInfo); break;
      case EntityType.campfire: createCampfire(position, rotation, tribe, connectionInfo); break;
      case EntityType.furnace: createFurnace(position, rotation, tribe, connectionInfo); break;
      case EntityType.researchBench: createResearchBench(position, rotation, tribe, connectionInfo); break;
      case EntityType.wall: createWall(position, rotation, tribe, connectionInfo); break;
      case EntityType.planterBox: createPlanterBox(position, rotation, tribe, connectionInfo); break;
      case EntityType.floorSpikes: createSpikes(position, rotation, tribe, connectionInfo); break;
      case EntityType.floorPunjiSticks: createPunjiSticks(position, rotation, tribe, connectionInfo); break;
      case EntityType.ballista: createBlueprintEntity(position, rotation, BlueprintType.ballista, 0, tribe); break;
      case EntityType.slingTurret: createBlueprintEntity(position, rotation, BlueprintType.slingTurret, 0, tribe); break;
      case EntityType.healingTotem: createHealingTotem(position, rotation, tribe, connectionInfo); break;
      case EntityType.fence: createFence(position, rotation, tribe, connectionInfo); break;
      case EntityType.fenceGate: createFenceGate(position, rotation, tribe, connectionInfo); break;
      case EntityType.frostshaper: createFrostshaper(position, rotation, tribe, connectionInfo); break;
      case EntityType.stonecarvingTable: createStonecarvingTable(position, rotation, tribe, connectionInfo); break;
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

export function useItem(tribeMember: Entity, item: Item, inventoryName: InventoryName, itemSlot: number): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);

   // @Cleanup: Extract each one of these cases into their own function

   switch (itemCategory) {
      case "armour": {
         // 
         // Equip the armour
         // 
         
         const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
         const targetItem = armourSlotInventory.itemSlots[1];
         
         // If the target item slot has a different item type, don't attempt to transfer
         if (typeof targetItem !== "undefined" && targetItem.type !== item.type) {
            return;
         }
         
         // Move to armour slot
         const inventory = getInventory(inventoryComponent, inventoryName);
         inventory.removeItem(itemSlot);
         armourSlotInventory.addItem(item, 1);
         break;
      }
      case "glove": {
         // 
         // Equip the glove
         // 
         
         const gloveSlotInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
         const targetItem = gloveSlotInventory.itemSlots[1];

         // If the target item slot has a different item type, don't attempt to transfer
         if (typeof targetItem !== "undefined" && targetItem.type !== item.type) {
            return;
         }

         // Move to glove slot
         const inventory = getInventory(inventoryComponent, inventoryName);
         inventory.removeItem(itemSlot);
         gloveSlotInventory.addItem(item, 1);
         break;
      }
      case "healing": {
         const healthComponent = HealthComponentArray.getComponent(tribeMember.id);

         // Don't use food if already at maximum health
         if (healthComponent.health >= healthComponent.maxHealth) return;

         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName)
         const inventory = useInfo.inventory;
         
         healEntity(tribeMember, itemInfo.healAmount, tribeMember.id);
         consumeItemFromSlot(inventory, itemSlot, 1);

         useInfo.lastEatTicks = Board.ticks;

         if (item.type === ItemType.berry && Math.random() < 0.05) {
            awardTitle(tribeMember, TribesmanTitle.berrymuncher);
         }

         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            // Remove all debuffs
            clearStatusEffects(tribeMember.id);
         }

         break;
      }
      case "placeable": {
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(tribeMember.position, tribeMember.rotation, structureType, Board.chunks);

         // Make sure the placeable item can be placed
         if (!placeInfo.isValid) return;
         
         const structureInfo: StructureConnectionInfo = {
            connectedEntityIDs: placeInfo.connectedEntityIDs,
            connectedSidesBitset: placeInfo.connectedSidesBitset
         };
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         placeBuilding(tribeComponent.tribe, placeInfo.position, placeInfo.rotation, placeInfo.entityType, structureInfo);

         const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
         consumeItemFromSlot(inventory, itemSlot, 1);

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

         let arrowPhysicsComponent: PhysicsComponent;
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
               };

               const arrow = createWoodenArrow(spawnPosition, tribeMember.rotation, tribeMember.id, arrowInfo);
               arrowPhysicsComponent = arrow.components[ServerComponentType.physics];
               break;
            }
            case ItemType.ice_bow: {
               const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
               
               const arrow = createIceArrow(spawnPosition, tribeMember.rotation, tribeComponent.tribe);
               arrowPhysicsComponent = arrow.components[ServerComponentType.physics];
               break;
            }
            default: {
               throw new Error("No case for bow type " + item.type);
            }
         }

         arrowPhysicsComponent.velocity.x = itemInfo.projectileSpeed * Math.sin(tribeMember.rotation);
         arrowPhysicsComponent.velocity.y = itemInfo.projectileSpeed * Math.cos(tribeMember.rotation);
         
         break;
      }
      case "crossbow": {
         // Don't fire if not loaded
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);

         const loadProgress = useInfo.crossbowLoadProgressRecord[itemSlot];
         if (typeof loadProgress === "undefined" || loadProgress < 1) {
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
         };

         const arrowCreationInfo = createWoodenArrow(spawnPosition, tribeMember.rotation, tribeMember.id, arrowInfo);
         
         const physicsComponent = arrowCreationInfo.components[ServerComponentType.physics];
         physicsComponent.velocity.x = itemInfo.projectileSpeed * Math.sin(tribeMember.rotation);
         physicsComponent.velocity.y = itemInfo.projectileSpeed * Math.cos(tribeMember.rotation);

         delete useInfo.crossbowLoadProgressRecord[itemSlot];
         
         break;
      }
      case "spear": {
         // 
         // Throw the spear
         // 

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);
         const useInfo = getInventoryUseInfo(inventoryUseComponent, inventoryName);
         const inventory = useInfo.inventory;

         const offsetDirection = tribeMember.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = tribeMember.position.x + 35 * Math.sin(offsetDirection);
         const y = tribeMember.position.y + 35 * Math.cos(offsetDirection);
         const spearCreationInfo = createSpearProjectile(new Point(x, y), tribeMember.rotation, tribeMember.id, item);

         const ticksSinceLastAction = Board.ticks - useInfo.lastSpearChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(1000, 1700, Math.min(secondsSinceLastAction / 3, 1));

         const physicsComponent = spearCreationInfo.components[ServerComponentType.physics];
         physicsComponent.velocity.x = velocityMagnitude * Math.sin(tribeMember.rotation);
         physicsComponent.velocity.y = velocityMagnitude * Math.cos(tribeMember.rotation);

         consumeItemFromSlot(inventory, itemSlot, 1);

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
         const battleaxeCreationInfo = createBattleaxeProjectile(new Point(x, y), tribeMember.rotation, tribeMember.id, item, tribeComponent.tribe);

         const ticksSinceLastAction = Board.ticks - useInfo.lastBattleaxeChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(600, 1100, Math.min(secondsSinceLastAction / 3, 1));

         const battleaxePhysicsComponent = battleaxeCreationInfo.components[ServerComponentType.physics];
         const tribesmanPhysicsComponent = PhysicsComponentArray.getComponent(tribeMember.id);
         battleaxePhysicsComponent.velocity.x = tribesmanPhysicsComponent.velocity.x + velocityMagnitude * Math.sin(tribeMember.rotation);
         battleaxePhysicsComponent.velocity.y = tribesmanPhysicsComponent.velocity.y + velocityMagnitude * Math.cos(tribeMember.rotation);

         useInfo.lastBattleaxeChargeTicks = Board.ticks;
         useInfo.thrownBattleaxeItemID = item.id;
         
         break;
      }
   }
}

export function tribeMemberCanPickUpItem(tribeMember: Entity, itemType: ItemType): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
   const inventory = getInventory(inventoryComponent, InventoryName.hotbar);

   if (!inventoryIsFull(inventory)) {
      return true;
   }
   
   for (let i = 0; i < inventory.items.length; i++) {
      const item = inventory.items[i];

      if (item.type === itemType && itemIsStackable(item.type) && item.count < getItemStackSize(item)) {
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
   
         if (inventoryUseInfo.foodEatingTimer <= 0) {
            const selectedItem = inventoryUseInfo.inventory.itemSlots[inventoryUseInfo.selectedItemSlot];
            if (typeof selectedItem !== "undefined") {
               const itemCategory = ITEM_TYPE_RECORD[selectedItem.type];
               if (itemCategory === "healing") {
                  useItem(tribeMember, selectedItem, inventoryUseInfo.inventory.name, inventoryUseInfo.selectedItemSlot);
   
                  const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as ConsumableItemInfo;
                  inventoryUseInfo.foodEatingTimer = itemInfo.consumeTime;

                  if (TribesmanAIComponentArray.hasComponent(tribeMember.id) && Math.random() < TITLE_REWARD_CHANCES.BERRYMUNCHER_REWARD_CHANCE) {
                     awardTitle(tribeMember, TribesmanTitle.berrymuncher);
                  }
               }
            }
         }
         break;
      }
      case LimbAction.loadCrossbow: {
         const loadProgress = inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot];
         if (typeof loadProgress === "undefined") {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] = Settings.I_TPS;
         } else {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot]! += Settings.I_TPS;
         }
         
         if (inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot]! >= 1) {
            inventoryUseInfo.crossbowLoadProgressRecord[inventoryUseInfo.selectedItemSlot] = 1;
            inventoryUseInfo.action = LimbAction.none;
         }
         
         break;
      }
   }
}

export function tickTribeMember(tribeMember: Entity): void {
   // Vacuum nearby items to the tribesman
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   // @Bug: permits vacuuming the same item entity twice
   const minChunkX = Math.max(Math.floor((tribeMember.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((tribeMember.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((tribeMember.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((tribeMember.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (itemEntity.type !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, tribeMember.id)) {
               continue;
            }

            const itemComponent = ItemComponentArray.getComponent(itemEntity.id);
            if (!tribeMemberCanPickUpItem(tribeMember, itemComponent.itemType)) {
               continue;
            }
            
            const distance = tribeMember.position.calculateDistanceBetween(itemEntity.position);
            if (distance <= VACUUM_RANGE) {
               // @Temporary
               let forceMult = 1 - distance / VACUUM_RANGE;
               forceMult = lerp(0.5, 1, forceMult);

               const vacuumDirection = itemEntity.position.calculateAngleBetween(tribeMember.position);
               const physicsComponent = PhysicsComponentArray.getComponent(itemEntity.id);
               physicsComponent.velocity.x += VACUUM_STRENGTH * forceMult * Math.sin(vacuumDirection);
               physicsComponent.velocity.y += VACUUM_STRENGTH * forceMult * Math.cos(vacuumDirection);
            }
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(tribeMember.id);
   if (physicsComponent.velocity.x !== 0 || physicsComponent.velocity.y !== 0) {
      const chance = TITLE_REWARD_CHANCES.SPRINTER_REWARD_CHANCE_PER_SPEED * physicsComponent.velocity.length();
      if (Math.random() < chance / Settings.TPS) {
         awardTitle(tribeMember, TribesmanTitle.sprinter);
      }
   }

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember.id);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember.id);

   const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.hotbar);
   tickInventoryUseInfo(tribeMember, useInfo);

   const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
   if (tribeComponent.tribe.type === TribeType.barbarians && tribeMember.type !== EntityType.tribeWorker) {
      const useInfo = getInventoryUseInfo(inventoryUseComponent, InventoryName.offhand);
      tickInventoryUseInfo(tribeMember, useInfo);
   }

   // @Speed: Shouldn't be done every tick, only do when the backpack changes
   // Update backpack
   const backpackSlotInventory = getInventory(inventoryComponent, InventoryName.backpackSlot);
   const backpack = backpackSlotInventory.itemSlots[1];
   if (typeof backpack !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[backpack.type] as BackpackItemInfo;
      resizeInventory(inventoryComponent, InventoryName.backpack, itemInfo.inventoryWidth, itemInfo.inventoryHeight);
   } else {
      resizeInventory(inventoryComponent, InventoryName.backpack, 0, 0);
   }
      
   const healthComponent = HealthComponentArray.getComponent(tribeMember.id);

   // @Speed: Shouldn't be done every tick, only do when the armour changes
   // Armour defence
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const armour = armourSlotInventory.itemSlots[1];
   if (typeof armour !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[armour.type] as ArmourItemInfo;
      addDefence(healthComponent, itemInfo.defence, "armour");

      if (armour.type === ItemType.leaf_suit) {
         tribeMember.collisionMask &= ~COLLISION_BITS.plants;
      } else {
         tribeMember.collisionMask |= COLLISION_BITS.plants;
      }
   } else {
      removeDefence(healthComponent, "armour");
   }
}

export function onTribeMemberHurt(tribeMember: Entity, attackingEntityID: number): void {
   const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
   tribeComponent.tribe.addAttackingEntity(attackingEntityID);
   
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribeMember.id);
   for (let i = 0; i < tribeMemberComponent.fishFollowerIDs.length; i++) {
      const fishID = tribeMemberComponent.fishFollowerIDs[i];
      const fish = Board.entityRecord[fishID]!;
      onFishLeaderHurt(fish, attackingEntityID);
   }
}

export function entityIsTribesman(entityType: EntityType): boolean {
   return entityType === EntityType.player || entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior;
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

// @Hack
const getFenceGatePlaceDirection = (fence: Entity): number | null => {
   const structureComponent = StructureComponentArray.getComponent(fence.id);

   // Top and bottom fence connections
   let normalDirectionOffset: number;
   if (structureComponent.connectedSidesBitset === 0b0101) {
      normalDirectionOffset = Math.PI * 0.5;
   } else if (structureComponent.connectedSidesBitset === 0b1010) {
      normalDirectionOffset = 0;
   } else {
      return null;
   }

   return fence.rotation + normalDirectionOffset;
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
      case BlueprintType.stoneTunnel: {
         const position = building.position.copy();
         if (blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.stoneEmbrasure) {
            position.x += 22 * Math.sin(dynamicRotation);
            position.y += 22 * Math.cos(dynamicRotation);
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         createBlueprintEntity(position, dynamicRotation, blueprintType, 0, tribeComponent.tribe);
         
         building.destroy();
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

         let rotation = getFenceGatePlaceDirection(building);
         if (rotation === null) {
            console.warn("Tried to place a blueprint for a fence gate which had no valid direction!");
            return;
         }

         // Make rotation face away from player
         if (dotAngles(rotation, tribeMember.rotation) < 0) {
            rotation = rotation + Math.PI;
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember.id);
         createBlueprintEntity(building.position.copy(), rotation, blueprintType, building.id, tribeComponent.tribe);

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
export function onTribesmanCollision(tribesmanID: number, collidingEntity: Entity): void {
   if (collidingEntity.type === EntityType.itemEntity) {
      const itemComponent = ItemComponentArray.getComponent(collidingEntity.id);
      // Keep track of it beforehand as the amount variable gets changed when being picked up
      const itemAmount = itemComponent.amount;

      const wasPickedUp = pickupItemEntity(tribesmanID, collidingEntity);

      if (wasPickedUp && itemComponent.throwingEntityID !== 0 && itemComponent.throwingEntityID !== tribesmanID) {
         adjustTribesmanRelationsAfterGift(tribesmanID, itemComponent.throwingEntityID, itemComponent.itemType, itemAmount);
      }
   }
}

export function throwItem(tribesman: Entity, inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman.id);
   const inventory = getInventory(inventoryComponent, inventoryName);

   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") {
      return;
   }
   
   const itemType = item.type;
   const amountRemoved = consumeItemFromSlot(inventory, itemSlot, dropAmount);

   const dropPosition = tribesman.position.copy();
   dropPosition.x += Vars.ITEM_THROW_OFFSET * Math.sin(throwDirection);
   dropPosition.y += Vars.ITEM_THROW_OFFSET * Math.cos(throwDirection);

   // Create the item entity
   const itemEntityCreationInfo = createItemEntity(dropPosition, 2 * Math.PI * Math.random(), itemType, amountRemoved, tribesman.id);

   // Throw the dropped item away from the player
   const physicsComponent = itemEntityCreationInfo.components[ServerComponentType.physics];
   const tribesmanPhysicsComponent = PhysicsComponentArray.getComponent(tribesman.id);
   physicsComponent.velocity.x += tribesmanPhysicsComponent.velocity.x + Vars.ITEM_THROW_FORCE * Math.sin(throwDirection);
   physicsComponent.velocity.y += tribesmanPhysicsComponent.velocity.y + Vars.ITEM_THROW_FORCE * Math.cos(throwDirection);

   if (TribesmanAIComponentArray.hasComponent(tribesman.id)) {
      const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman.id);
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