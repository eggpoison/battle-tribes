import { AttackEffectiveness, calculateAttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { HitFlags } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS } from "webgl-test-shared/dist/collision";
import { PlanterBoxPlant, BlueprintType, BuildingMaterial, MATERIAL_TO_ITEM_MAP, ServerComponentType } from "webgl-test-shared/dist/components";
import { EntityType, LimbAction, PlayerCauseOfDeath, EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { StructureConnectionInfo, StructureType, calculateStructurePlaceInfo } from "webgl-test-shared/dist/structures";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { TribeType } from "webgl-test-shared/dist/tribes";
import { Point, dotAngles, lerp } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig, entityIsStructure } from "../../Entity";
import Board from "../../Board";
import { InventoryComponentArray, consumeItemFromSlot, consumeItemType, countItemType, getInventory, inventoryIsFull, pickupItemEntity, resizeInventory } from "../../components/InventoryComponent";
import { getEntitiesInRange } from "../../ai-shared";
import { HealthComponentArray, addDefence, damageEntity, healEntity, removeDefence } from "../../components/HealthComponent";
import { applyStatusEffect, clearStatusEffects } from "../../components/StatusEffectComponent";
import { onFishLeaderHurt } from "../mobs/fish";
import { InventoryUseComponentArray, InventoryUseInfo } from "../../components/InventoryUseComponent";
import { createBattleaxeProjectileConfig } from "../projectiles/battleaxe-projectile";
import { createIceArrowConfig } from "../projectiles/ice-arrow";
import { doBlueprintWork } from "../../components/BlueprintComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { getItemAttackCooldown } from "../../items";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import Tribe from "../../Tribe";
import { entityIsResource } from "./tribesman-ai/tribesman-resource-gathering";
import { TribesmanAIComponentArray, adjustTribesmanRelationsAfterGift } from "../../components/TribesmanAIComponent";
import { TITLE_REWARD_CHANCES } from "../../tribesman-title-generation";
import { TribeMemberComponentArray, awardTitle, hasTitle } from "../../components/TribeMemberComponent";
import { BERRY_BUSH_RADIUS, dropBerryOverEntity } from "../resources/berry-bush";
import { createItemEntityConfig, itemEntityCanBePickedUp } from "../item-entity";
import { PlantComponentArray, plantIsFullyGrown } from "../../components/PlantComponent";
import { ItemComponentArray } from "../../components/ItemComponent";
import { StructureComponentArray } from "../../components/StructureComponent";
import { TREE_RADII, TreeComponentArray } from "../../components/TreeComponent";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { BuildingMaterialComponentArray } from "../../components/BuildingMaterialComponent";
import { CraftingStation } from "webgl-test-shared/dist/items/crafting-recipes";
import { Item, ITEM_TYPE_RECORD, ITEM_INFO_RECORD, BattleaxeItemInfo, SwordItemInfo, AxeItemInfo, itemInfoIsTool, HammerItemInfo, InventoryName, ItemType, ConsumableItemInfo, ConsumableItemCategory, PlaceableItemType, BowItemInfo, itemIsStackable, getItemStackSize, BackpackItemInfo, ArmourItemInfo } from "webgl-test-shared/dist/items/items";
import { EntityTickEvent, EntityTickEventType } from "webgl-test-shared/dist/entity-events";
import { registerEntityTickEvent } from "../../server/player-clients";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createWoodenArrowConfig } from "../projectiles/wooden-arrow";
import { ComponentConfig } from "../../components";
import { createSpearProjectileConfig } from "../projectiles/spear-projectile";
import { createBlueprintEntityConfig } from "../blueprint-entity";
import { createEntityConfig } from "../../entity-creation";

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

const getDamageMultiplier = (entity: EntityID): number => {
   let multiplier = 1;

   if (TribeMemberComponentArray.hasComponent(entity)) {
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);

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

export function calculateItemDamage(entity: EntityID, item: Item | null, attackEffectiveness: AttackEffectiveness): number {
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

const getRepairTimeMultiplier = (tribeMember: EntityID): number => {
   let multiplier = 1;
   
   if (Board.getEntityType(tribeMember) === EntityType.tribeWarrior) {
      multiplier *= 2;
   }

   return multiplier;
}

const getRepairAmount = (tribeMember: EntityID, hammerItem: Item): number => {
   const itemInfo = ITEM_INFO_RECORD[hammerItem.type] as HammerItemInfo;
   let repairAmount = itemInfo.repairAmount;

   if (hasTitle(tribeMember, TribesmanTitle.builder)) {
      repairAmount *= 1.5;
   }
   
   return Math.round(repairAmount);
}

// @Cleanup: lot of copy and paste from attemptAttack
// @Cleanup: Maybe split this up into repair and work functions
export function repairBuilding(tribeMember: EntityID, targetEntity: EntityID, itemSlot: number, inventoryName: InventoryName): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);

   const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

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

   if (Board.getEntityType(targetEntity) === EntityType.blueprintEntity) {
      // If holding a hammer and attacking a friendly blueprint, work on the blueprint instead of damaging it
      const tribeComponent = TribeComponentArray.getComponent(tribeMember);
      const blueprintTribeComponent = TribeComponentArray.getComponent(targetEntity);
      if (blueprintTribeComponent.tribe === tribeComponent.tribe) {
         doBlueprintWork(targetEntity, item);
         return true;
      }
   } else if (entityIsStructure(targetEntity)) {
      // Heal friendly structures
      const tribeComponent = TribeComponentArray.getComponent(tribeMember);
      const buildingTribeComponent = TribeComponentArray.getComponent(targetEntity);
      if (buildingTribeComponent.tribe === tribeComponent.tribe) {
         const repairAmount = getRepairAmount(tribeMember, item);
         healEntity(targetEntity, repairAmount, tribeMember);
         return true;
      }
   }

   console.warn("Couldn't repair/build the entity: not a blueprint or in STRUCTURE_TYPES.")
   return false;
}

export function getSwingTimeMultiplier(entity: EntityID, targetEntity: EntityID, item: Item | null): number {
   let swingTimeMultiplier = 1;

   if (TribeComponentArray.hasComponent(entity)) {
      // Barbarians swing 30% slower
      const tribeComponent = TribeComponentArray.getComponent(entity);
      if (tribeComponent.tribe.tribeType === TribeType.barbarians) {
         swingTimeMultiplier /= 0.7;
      }
   
      // Warriors attack resources slower
      if (Board.getEntityType(entity) === EntityType.tribeWarrior && entityIsResource(targetEntity)) {
         swingTimeMultiplier *= 2.5;
      }
   }

   // Builers swing hammers 30% faster
   if (hasTitle(entity, TribesmanTitle.builder) && item !== null && ITEM_TYPE_RECORD[item.type] === "hammer") {
      swingTimeMultiplier /= 1.3;
   }

   return swingTimeMultiplier;
}

const isBerryBushWithBerries = (entity: EntityID): boolean => {
   switch (Board.getEntityType(entity)) {
      case EntityType.berryBush: {
         const berryBushComponent = BerryBushComponentArray.getComponent(entity);
         return berryBushComponent.numBerries > 0;
      }
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity);
         return plantComponent.plantType === PlanterBoxPlant.berryBush && plantComponent.numFruit > 0;
      }
      default: {
         return false;
      }
   }
}

const getPlantGatherAmount = (tribeman: EntityID, plant: EntityID, gloves: Item | null): number => {
   let amount = 1;

   if (hasTitle(tribeman, TribesmanTitle.berrymuncher) && isBerryBush(plant)) {
      if (Math.random() < 0.3) {
         amount++;
      }
   }

   if (hasTitle(tribeman, TribesmanTitle.gardener)) {
      if (Math.random() < 0.3) {
         amount++;
      }
   }

   if (gloves !== null && gloves.type === ItemType.gardening_gloves) {
      if (Math.random() < 0.2) {
         amount++;
      }
   }

   return amount;
}

const gatherPlant = (plant: EntityID, attacker: EntityID, gloves: Item | null): void => {
   const plantTransformComponent = TransformComponentArray.getComponent(plant);
   
   if (isBerryBushWithBerries(plant)) {
      const gatherMultiplier = getPlantGatherAmount(attacker, plant, gloves);

      // As hitting the bush will drop a berry regardless, only drop extra ones here
      for (let i = 0; i < gatherMultiplier - 1; i++) {
         dropBerryOverEntity(plant);
      }
   } else {
      // @Hack @Cleanup: Do from hitboxes
      let plantRadius: number;
      switch (Board.getEntityType(plant)) {
         case EntityType.tree: {
            const treeComponent = TreeComponentArray.getComponent(plant);
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
      const x = plantTransformComponent.position.x + (plantRadius - 7) * Math.sin(offsetDirection);
      const y = plantTransformComponent.position.y + (plantRadius - 7) * Math.cos(offsetDirection);
   
      const config = createItemEntityConfig();
      config[ServerComponentType.transform].position.x = x;
      config[ServerComponentType.transform].position.y = y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.item].itemType = ItemType.leaf;
      config[ServerComponentType.item].amount = 1;
      createEntityFromConfig(config);
   }

   // @Hack
   const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
   const collisionPoint = new Point((plantTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (plantTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   damageEntity(plant, attacker, 0, 0, AttackEffectiveness.ineffective, collisionPoint, HitFlags.NON_DAMAGING_HIT);
}

/**
 * @param targetEntity The entity to attack
 * @param itemSlot The item slot being used to attack the entity
 * @returns Whether or not the attack succeeded
 */
// @Cleanup: (?) Pass in the item to use directly instead of passing in the item slot and inventory name
// @Cleanup: Not just for tribe members, move to different file
export function attemptAttack(attacker: EntityID, targetEntity: EntityID, itemSlot: number, inventoryName: InventoryName): boolean {
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(attacker);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      return false;
   }

   const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

   // Don't attack if on cooldown or not doing another action
   if (typeof useInfo.itemAttackCooldowns[itemSlot] !== "undefined" || useInfo.extraAttackCooldownTicks > 0 || useInfo.action !== LimbAction.none) {
      return false;
   }
   
   // Find the selected item
   const inventoryComponent = InventoryComponentArray.getComponent(attacker);
   const inventory = getInventory(inventoryComponent, inventoryName);
   let item: Item | null | undefined = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined" || useInfo.thrownBattleaxeItemID === item.id) {
      item = null;
   }

   const attackerEntityType = Board.getEntityType(targetEntity)!;
   const targetEntityType = Board.getEntityType(targetEntity)!;

   const attackEffectiveness = calculateAttackEffectiveness(item, targetEntityType);

   // Reset attack cooldown
   // @Hack
   // const baseAttackCooldown = item !== null ? getItemAttackCooldown(item) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const baseAttackCooldown = item !== null ? (item.type === ItemType.gardening_gloves ? 1 : getItemAttackCooldown(item)) : Settings.DEFAULT_ATTACK_COOLDOWN;
   const attackCooldown = baseAttackCooldown * getSwingTimeMultiplier(attacker, targetEntity, item);
   useInfo.itemAttackCooldowns[itemSlot] = attackCooldown;
   useInfo.lastAttackCooldown = attackCooldown;
   useInfo.lastAttackTicks = Board.ticks;
   if (attackerEntityType !== EntityType.player) {
      inventoryUseComponent.globalAttackCooldown = Settings.GLOBAL_ATTACK_COOLDOWN;
   }

   // @Cleanup @Speed: Make a function (e.g. attemptTribesmanAttack) which does this check using the return val of attemptTack
   if (attackerEntityType === EntityType.tribeWorker) {
      useInfo.extraAttackCooldownTicks = Math.floor(0.1 * Settings.TPS);
   }

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((item === null || item.type === ItemType.leaf) && (targetEntityType === EntityType.tree || targetEntityType === EntityType.berryBush || targetEntityType === EntityType.plant)) {
      const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
      const gloves = gloveInventory.itemSlots[1];
      if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
         gatherPlant(targetEntity, attacker, gloves);
         return true;
      }
   }

   const attackDamage = calculateItemDamage(attacker, item, attackEffectiveness);
   const attackKnockback = calculateItemKnockback(item);

   const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);
   const attackerTransformComponent = TransformComponentArray.getComponent(attacker);

   const hitDirection = attackerTransformComponent.position.calculateAngleBetween(targetEntityTransformComponent.position);

   // @Hack
   const collisionPoint = new Point((targetEntityTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (targetEntityTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   // Register the hit
   const hitFlags = item !== null && item.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0;
   damageEntity(targetEntity, attacker, attackDamage, PlayerCauseOfDeath.tribe_member, attackEffectiveness, collisionPoint, hitFlags);
   applyKnockback(targetEntity, attackKnockback, hitDirection);

   if (item !== null && item.type === ItemType.flesh_sword) {
      applyStatusEffect(targetEntity, StatusEffect.poisoned, 3 * Settings.TPS);
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attacker, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(targetEntity, StatusEffect.bleeding, 2 * Settings.TPS);
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
export function calculateAttackTarget(tribeMember: EntityID, targetEntities: ReadonlyArray<EntityID>, attackableEntityRelationshipMask: number): EntityID | null {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   
   let closestEntity: EntityID | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   let maxAttackPriority = 0;
   for (const targetEntity of targetEntities) {
      // Don't attack entities without health components
      if (!HealthComponentArray.hasComponent(targetEntity)) {
         continue;
      }

      // @Temporary
      const targetEntityType = Board.getEntityType(targetEntity)!;
      if (targetEntityType === EntityType.plant) {
         const plantComponent = PlantComponentArray.getComponent(targetEntity);
         if (!plantIsFullyGrown(plantComponent)) {
            continue;
         }
      }

      const relationship = getEntityRelationship(tribeMember, targetEntity);
      if ((relationship & attackableEntityRelationshipMask) === 0) {
         continue;
      }

      const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);

      const attackPriority = getEntityAttackPriority(targetEntityType);
      const dist = transformComponent.position.calculateDistanceBetween(targetEntityTransformComponent.position);

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


export function calculateRepairTarget(tribeMember: EntityID, targetEntities: ReadonlyArray<EntityID>): EntityID | null {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);

   let closestEntity: EntityID | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const targetEntity of targetEntities) {
      // Don't attack entities without health components
      if (!HealthComponentArray.hasComponent(targetEntity)) {
         continue;
      }

      // Only repair damaged buildings
      const healthComponent = HealthComponentArray.getComponent(targetEntity);
      if (healthComponent.health === healthComponent.maxHealth) {
         continue;
      }

      const relationship = getEntityRelationship(tribeMember, targetEntity);
      if (relationship !== EntityRelationship.friendlyBuilding) {
         continue;
      }

      const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);

      const dist = transformComponent.position.calculateDistanceBetween(targetEntityTransformComponent.position);
      if (dist < minDistance) {
         closestEntity = targetEntity;
         minDistance = dist;
      }
   }
   
   if (closestEntity === null) return null;

   return closestEntity;
}


export function calculateBlueprintWorkTarget(tribeMember: EntityID, targetEntities: ReadonlyArray<EntityID>): EntityID | null {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);

   let closestEntity: EntityID | null = null;
   let minDistance = Number.MAX_SAFE_INTEGER;
   for (const targetEntity of targetEntities) {
      // Don't attack entities without health components
      if (Board.getEntityType(targetEntity) !== EntityType.blueprintEntity) {
         continue;
      }

      const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);

      const dist = transformComponent.position.calculateDistanceBetween(targetEntityTransformComponent.position);
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
export function calculateRadialAttackTargets(entity: EntityID, attackOffset: number, attackRadius: number): ReadonlyArray<EntityID> {
   const transformComponent = TransformComponentArray.getComponent(entity);
   
   const attackPositionX = transformComponent.position.x + attackOffset * Math.sin(transformComponent.rotation);
   const attackPositionY = transformComponent.position.y + attackOffset * Math.cos(transformComponent.rotation);
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
   const config = createEntityConfig(entityType);
   config[ServerComponentType.transform].position.x = position.x;
   config[ServerComponentType.transform].position.y = position.y;
   config[ServerComponentType.transform].rotation = rotation;
   config[ServerComponentType.tribe].tribe = tribe;
   config[ServerComponentType.structure].connectionInfo = connectionInfo;
   createEntityFromConfig(config);
}

export function useItem(tribeMember: EntityID, item: Item, inventoryName: InventoryName, itemSlot: number): void {
   const itemCategory = ITEM_TYPE_RECORD[item.type];

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);

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
         const healthComponent = HealthComponentArray.getComponent(tribeMember);

         // Don't use food if already at maximum health
         if (healthComponent.health >= healthComponent.maxHealth) return;

         const itemInfo = ITEM_INFO_RECORD[item.type] as ConsumableItemInfo;
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);

         const inventory = getInventory(inventoryComponent, inventoryName);
         const useInfo = inventoryUseComponent.getUseInfo(inventoryName)
         
         healEntity(tribeMember, itemInfo.healAmount, tribeMember);
         consumeItemFromSlot(inventory, itemSlot, 1);

         useInfo.lastEatTicks = Board.ticks;

         if (item.type === ItemType.berry && Math.random() < 0.05) {
            awardTitle(tribeMember, TribesmanTitle.berrymuncher);
         }

         if (itemInfo.consumableItemCategory === ConsumableItemCategory.medicine) {
            // Remove all debuffs
            clearStatusEffects(tribeMember);
         }

         break;
      }
      case "placeable": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         
         const structureType = ITEM_INFO_RECORD[item.type as PlaceableItemType].entityType;
         const placeInfo = calculateStructurePlaceInfo(transformComponent.position, transformComponent.rotation, structureType, Board.getWorldInfo());

         // Make sure the placeable item can be placed
         if (!placeInfo.isValid) return;
         
         const structureInfo: StructureConnectionInfo = {
            connectedEntityIDs: placeInfo.connectedEntityIDs,
            connectedSidesBitset: placeInfo.connectedSidesBitset
         };
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);
         placeBuilding(tribeComponent.tribe, placeInfo.position, placeInfo.rotation, placeInfo.entityType, structureInfo);

         const inventory = getInventory(inventoryComponent, InventoryName.hotbar);
         consumeItemFromSlot(inventory, itemSlot, 1);

         break;
      }
      case "bow": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const useInfo = inventoryUseComponent.getUseInfo(inventoryName);
         if (useInfo.bowCooldownTicks !== 0) {
            return;
         }

         const event: EntityTickEvent<EntityTickEventType.fireBow> = {
            entityID: tribeMember,
            type: EntityTickEventType.fireBow,
            data: item.type
         };
         registerEntityTickEvent(tribeMember, event);

         useInfo.lastBowChargeTicks = Board.ticks;

         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;
         useInfo.bowCooldownTicks = itemInfo.shotCooldownTicks;

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = transformComponent.position.copy();
         const offset = Point.fromVectorForm(35, transformComponent.rotation);
         spawnPosition.add(offset);

         let config: ComponentConfig<ServerComponentType.transform | ServerComponentType.physics>;
         switch (item.type) {
            case ItemType.wooden_bow:
            case ItemType.reinforced_bow: {
               config = createWoodenArrowConfig();
               break;
            }
            case ItemType.ice_bow: {
               config = createIceArrowConfig();
               break;
            }
            // @Robustness
            default: {
               throw new Error("No case for bow type " + item.type);
            }
         }
         config[ServerComponentType.transform].position.x = spawnPosition.x;
         config[ServerComponentType.transform].position.y = spawnPosition.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.physics].velocityX = itemInfo.projectileSpeed * Math.sin(transformComponent.rotation);
         config[ServerComponentType.physics].velocityY = itemInfo.projectileSpeed * Math.cos(transformComponent.rotation);
         createEntityFromConfig(config);
         
         break;
      }
      case "crossbow": {
         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         // Don't fire if not loaded
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

         const loadProgress = useInfo.crossbowLoadProgressRecord[itemSlot];
         if (typeof loadProgress === "undefined" || loadProgress < 1) {
            return;
         }

         // @Cleanup: Copy and paste
         const event: EntityTickEvent<EntityTickEventType.fireBow> = {
            entityID: tribeMember,
            type: EntityTickEventType.fireBow,
            data: item.type
         };
         registerEntityTickEvent(tribeMember, event);

         // Offset the arrow's spawn to be just outside of the tribe member's hitbox
         // @Speed: Garbage collection
         const spawnPosition = transformComponent.position.copy();
         const offset = Point.fromVectorForm(35, transformComponent.rotation);
         spawnPosition.add(offset);
         
         const itemInfo = ITEM_INFO_RECORD[item.type] as BowItemInfo;

         // @Copynpaste from bow above
         const config = createWoodenArrowConfig();
         config[ServerComponentType.transform].position.x = spawnPosition.x;
         config[ServerComponentType.transform].position.y = spawnPosition.y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.physics].velocityX = itemInfo.projectileSpeed * Math.sin(transformComponent.rotation);
         config[ServerComponentType.physics].velocityY = itemInfo.projectileSpeed * Math.cos(transformComponent.rotation);
         createEntityFromConfig(config);

         delete useInfo.crossbowLoadProgressRecord[itemSlot];
         
         break;
      }
      case "spear": {
         // 
         // Throw the spear
         // 

         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         
         const inventory = getInventory(inventoryComponent, inventoryName);
         const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

         const offsetDirection = transformComponent.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = transformComponent.position.x + 35 * Math.sin(offsetDirection);
         const y = transformComponent.position.y + 35 * Math.cos(offsetDirection);

         const ticksSinceLastAction = Board.ticks - useInfo.lastSpearChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(1000, 1700, Math.min(secondsSinceLastAction / 3, 1));

         const config = createSpearProjectileConfig();
         config[ServerComponentType.transform].position.x = x;
         config[ServerComponentType.transform].position.y = y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.physics].velocityX = velocityMagnitude * Math.sin(transformComponent.rotation);
         config[ServerComponentType.physics].velocityY = velocityMagnitude * Math.cos(transformComponent.rotation);
         config[ServerComponentType.throwingProjectile].tribeMemberID = tribeMember;
         createEntityFromConfig(config);

         consumeItemFromSlot(inventory, itemSlot, 1);

         useInfo.lastSpearChargeTicks = Board.ticks;
         
         break;
      }
      case "battleaxe": {
         // 
         // Throw the battleaxe
         // 

         const transformComponent = TransformComponentArray.getComponent(tribeMember);
         const physicsComponent = PhysicsComponentArray.getComponent(tribeMember);
         const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const useInfo = inventoryUseComponent.getUseInfo(inventoryName);

         const offsetDirection = transformComponent.rotation + Math.PI / 1.5 - Math.PI / 14;
         const x = transformComponent.position.x + 35 * Math.sin(offsetDirection);
         const y = transformComponent.position.y + 35 * Math.cos(offsetDirection);

         const ticksSinceLastAction = Board.ticks - useInfo.lastBattleaxeChargeTicks;
         const secondsSinceLastAction = ticksSinceLastAction / Settings.TPS;
         const velocityMagnitude = lerp(600, 1100, Math.min(secondsSinceLastAction / 3, 1));

         const config = createBattleaxeProjectileConfig();
         config[ServerComponentType.transform].position.x = x;
         config[ServerComponentType.transform].position.y = y;
         config[ServerComponentType.transform].rotation = transformComponent.rotation;
         config[ServerComponentType.physics].velocityX = physicsComponent.velocity.x + velocityMagnitude * Math.sin(transformComponent.rotation)
         config[ServerComponentType.physics].velocityY = physicsComponent.velocity.y + velocityMagnitude * Math.cos(transformComponent.rotation)
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         config[ServerComponentType.throwingProjectile].tribeMemberID = tribeMember;
         config[ServerComponentType.throwingProjectile].itemID = item.id;
         createEntityFromConfig(config);

         useInfo.lastBattleaxeChargeTicks = Board.ticks;
         useInfo.thrownBattleaxeItemID = item.id;
         
         break;
      }
   }
}

export function tribeMemberCanPickUpItem(tribeMember: EntityID, itemType: ItemType): boolean {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
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

// @Cleanup: Move to tick function
const tickInventoryUseInfo = (tribeMember: EntityID, inventoryUseInfo: InventoryUseInfo): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   
   switch (inventoryUseInfo.action) {
      case LimbAction.eat:
      case LimbAction.useMedicine: {
         inventoryUseInfo.foodEatingTimer -= Settings.I_TPS;
   
         if (inventoryUseInfo.foodEatingTimer <= 0) {
            const inventory = getInventory(inventoryComponent, inventoryUseInfo.usedInventoryName);
            
            const selectedItem = inventory.itemSlots[inventoryUseInfo.selectedItemSlot];
            if (typeof selectedItem !== "undefined") {
               const itemCategory = ITEM_TYPE_RECORD[selectedItem.type];
               if (itemCategory === "healing") {
                  useItem(tribeMember, selectedItem, inventory.name, inventoryUseInfo.selectedItemSlot);
   
                  const itemInfo = ITEM_INFO_RECORD[selectedItem.type] as ConsumableItemInfo;
                  inventoryUseInfo.foodEatingTimer = itemInfo.consumeTime;

                  if (TribesmanAIComponentArray.hasComponent(tribeMember) && Math.random() < TITLE_REWARD_CHANCES.BERRYMUNCHER_REWARD_CHANCE) {
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

export function tickTribeMember(tribeMember: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   
   // Vacuum nearby items to the tribesman
   // @Incomplete: Don't vacuum items which the player doesn't have the inventory space for
   // @Bug: permits vacuuming the same item entity twice
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - VACUUM_RANGE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + VACUUM_RANGE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const itemEntity of chunk.entities) {
            if (Board.getEntityType(itemEntity) !== EntityType.itemEntity || !itemEntityCanBePickedUp(itemEntity, tribeMember)) {
               continue;
            }

            const itemComponent = ItemComponentArray.getComponent(itemEntity);
            if (!tribeMemberCanPickUpItem(tribeMember, itemComponent.itemType)) {
               continue;
            }

            const itemEntityTransformComponent = TransformComponentArray.getComponent(itemEntity);
            
            const distance = transformComponent.position.calculateDistanceBetween(itemEntityTransformComponent.position);
            if (distance <= VACUUM_RANGE) {
               // @Temporary
               let forceMult = 1 - distance / VACUUM_RANGE;
               forceMult = lerp(0.5, 1, forceMult);

               const vacuumDirection = itemEntityTransformComponent.position.calculateAngleBetween(transformComponent.position);
               const physicsComponent = PhysicsComponentArray.getComponent(itemEntity);
               physicsComponent.velocity.x += VACUUM_STRENGTH * forceMult * Math.sin(vacuumDirection);
               physicsComponent.velocity.y += VACUUM_STRENGTH * forceMult * Math.cos(vacuumDirection);
            }
         }
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(tribeMember);
   if (physicsComponent.velocity.x !== 0 || physicsComponent.velocity.y !== 0) {
      const chance = TITLE_REWARD_CHANCES.SPRINTER_REWARD_CHANCE_PER_SPEED * physicsComponent.velocity.length();
      if (Math.random() < chance / Settings.TPS) {
         awardTitle(tribeMember, TribesmanTitle.sprinter);
      }
   }

   const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(tribeMember);

   const useInfo = inventoryUseComponent.getUseInfo(InventoryName.hotbar);
   tickInventoryUseInfo(tribeMember, useInfo);

   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   if (tribeComponent.tribe.tribeType === TribeType.barbarians && Board.getEntityType(tribeMember) !== EntityType.tribeWorker) {
      const useInfo = inventoryUseComponent.getUseInfo(InventoryName.offhand);
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
      
   const healthComponent = HealthComponentArray.getComponent(tribeMember);

   // @Speed: Shouldn't be done every tick, only do when the armour changes
   // Armour defence
   const armourSlotInventory = getInventory(inventoryComponent, InventoryName.armourSlot);
   const armour = armourSlotInventory.itemSlots[1];
   if (typeof armour !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[armour.type] as ArmourItemInfo;
      addDefence(healthComponent, itemInfo.defence, "armour");

      if (armour.type === ItemType.leaf_suit) {
         transformComponent.collisionMask &= ~COLLISION_BITS.plants;
      } else {
         transformComponent.collisionMask |= COLLISION_BITS.plants;
      }
   } else {
      removeDefence(healthComponent, "armour");
   }
}

export function onTribeMemberHurt(tribeMember: EntityID, attackingEntity: EntityID): void {
   const tribeComponent = TribeComponentArray.getComponent(tribeMember);
   tribeComponent.tribe.addAttackingEntity(attackingEntity);
   
   const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribeMember);
   for (let i = 0; i < tribeMemberComponent.fishFollowerIDs.length; i++) {
      const fish = tribeMemberComponent.fishFollowerIDs[i];
      onFishLeaderHurt(fish, attackingEntity);
   }
}

export function entityIsTribesman(entityType: EntityType): boolean {
   return entityType === EntityType.player || entityType === EntityType.tribeWorker || entityType === EntityType.tribeWarrior;
}

export function wasTribeMemberKill(attackingEntity: EntityID | null): boolean {
   return attackingEntity !== null && TribeComponentArray.hasComponent(attackingEntity);
}

const blueprintTypeMatchesBuilding = (structure: EntityID, blueprintType: BlueprintType): boolean => {
   const materialComponent = BuildingMaterialComponentArray.getComponent(structure);

   const entityType = Board.getEntityType(structure)!;
   
   if (entityType === EntityType.wall) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWall || blueprintType === BlueprintType.woodenDoor || blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.woodenTunnel;
         case BuildingMaterial.stone: return blueprintType === BlueprintType.stoneDoor || blueprintType === BlueprintType.stoneEmbrasure || blueprintType === BlueprintType.stoneTunnel;
      }
   }

   if (entityType === EntityType.door) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneDoorUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.embrasure) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneEmbrasureUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.tunnel) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneTunnelUpgrade;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.floorSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneFloorSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.wallSpikes) {
      switch (materialComponent.material) {
         case BuildingMaterial.wood: return blueprintType === BlueprintType.stoneWallSpikes;
         case BuildingMaterial.stone: return false;
      }
   }

   if (entityType === EntityType.workerHut) {
      return blueprintType === BlueprintType.warriorHutUpgrade;
   }

   if (entityType === EntityType.fence) {
      return blueprintType === BlueprintType.fenceGate;
   }

   return false;
}

// @Hack
const getFenceGatePlaceDirection = (fence: EntityID): number | null => {
   const structureComponent = StructureComponentArray.getComponent(fence);

   // Top and bottom fence connections
   let normalDirectionOffset: number;
   if (structureComponent.connectedSidesBitset === 0b0101) {
      normalDirectionOffset = Math.PI * 0.5;
   } else if (structureComponent.connectedSidesBitset === 0b1010) {
      normalDirectionOffset = 0;
   } else {
      return null;
   }

   const transformComponent = TransformComponentArray.getComponent(fence);
   return transformComponent.rotation + normalDirectionOffset;
}

export function placeBlueprint(tribeMember: EntityID, structure: EntityID, blueprintType: BlueprintType, dynamicRotation: number): void {
   if (!blueprintTypeMatchesBuilding(structure, blueprintType)) {
      return;
   }

   const structureTransformComponent = TransformComponentArray.getComponent(structure);
   
   // @Cleanup
   switch (blueprintType) {
      case BlueprintType.woodenEmbrasure:
      case BlueprintType.woodenDoor:
      case BlueprintType.woodenTunnel:
      case BlueprintType.stoneDoor:
      case BlueprintType.stoneEmbrasure:
      case BlueprintType.stoneTunnel: {
         const position = structureTransformComponent.position.copy();
         if (blueprintType === BlueprintType.woodenEmbrasure || blueprintType === BlueprintType.stoneEmbrasure) {
            position.x += 22 * Math.sin(dynamicRotation);
            position.y += 22 * Math.cos(dynamicRotation);
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig();
         config[ServerComponentType.transform].position.x = position.x;
         config[ServerComponentType.transform].position.y = position.y;
         config[ServerComponentType.transform].rotation = dynamicRotation;
         config[ServerComponentType.blueprint].blueprintType = blueprintType;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         createEntityFromConfig(config);
         
         Board.destroyEntity(structure);
         break;
      }
      case BlueprintType.stoneDoorUpgrade:
      case BlueprintType.stoneEmbrasureUpgrade:
      case BlueprintType.stoneTunnelUpgrade:
      case BlueprintType.stoneFloorSpikes:
      case BlueprintType.stoneWallSpikes:
      case BlueprintType.stoneWall: {
         const materialComponent = BuildingMaterialComponentArray.getComponent(structure);
         const upgradeMaterialItemType = MATERIAL_TO_ITEM_MAP[(materialComponent.material + 1) as BuildingMaterial];
         
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, upgradeMaterialItemType) < 5) {
            return;
         }

         // Upgrade

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig();
         config[ServerComponentType.transform].position.x = structureTransformComponent.position.x;
         config[ServerComponentType.transform].position.y = structureTransformComponent.position.y;
         config[ServerComponentType.transform].rotation = structureTransformComponent.rotation;
         config[ServerComponentType.blueprint].blueprintType = blueprintType;
         config[ServerComponentType.blueprint].associatedEntityID = structure;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         createEntityFromConfig(config);
         
         consumeItemType(inventoryComponent, upgradeMaterialItemType, 5);
         break;
      }
      case BlueprintType.warriorHutUpgrade: {
         // @Cleanup: copy and paste

         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, ItemType.rock) < 25 || countItemType(inventoryComponent, ItemType.wood) < 15) {
            return;
         }

         // Upgrade

         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig();
         config[ServerComponentType.transform].position.x = structureTransformComponent.position.x;
         config[ServerComponentType.transform].position.y = structureTransformComponent.position.y;
         config[ServerComponentType.transform].rotation = structureTransformComponent.rotation;
         config[ServerComponentType.blueprint].blueprintType = blueprintType;
         config[ServerComponentType.blueprint].associatedEntityID = structure;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         createEntityFromConfig(config);

         consumeItemType(inventoryComponent, ItemType.rock, 25);
         consumeItemType(inventoryComponent, ItemType.wood, 15);

         break;
      }
      case BlueprintType.fenceGate: {
         const inventoryComponent = InventoryComponentArray.getComponent(tribeMember);
         if (countItemType(inventoryComponent, ItemType.wood) < 5) {
            return;
         }

         let rotation = getFenceGatePlaceDirection(structure);
         if (rotation === null) {
            console.warn("Tried to place a blueprint for a fence gate which had no valid direction!");
            return;
         }

         const transformComponent = TransformComponentArray.getComponent(tribeMember);

         // Make rotation face away from player
         if (dotAngles(rotation, transformComponent.rotation) < 0) {
            rotation = rotation + Math.PI;
         }
         
         const tribeComponent = TribeComponentArray.getComponent(tribeMember);

         const config = createBlueprintEntityConfig();
         config[ServerComponentType.transform].position.x = structureTransformComponent.position.x;
         config[ServerComponentType.transform].position.y = structureTransformComponent.position.y;
         config[ServerComponentType.transform].rotation = rotation;
         config[ServerComponentType.blueprint].blueprintType = blueprintType;
         config[ServerComponentType.blueprint].associatedEntityID = structure;
         config[ServerComponentType.tribe].tribe = tribeComponent.tribe;
         createEntityFromConfig(config);

         consumeItemType(inventoryComponent, ItemType.wood, 5);
      }
   }
}

export function getAvailableCraftingStations(tribeMember: EntityID): ReadonlyArray<CraftingStation> {
   const transformComponent = TransformComponentArray.getComponent(tribeMember);
   
   const minChunkX = Math.max(Math.floor((transformComponent.position.x - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkX = Math.min(Math.floor((transformComponent.position.x + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);
   const minChunkY = Math.max(Math.floor((transformComponent.position.y - Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), 0);
   const maxChunkY = Math.min(Math.floor((transformComponent.position.y + Settings.MAX_CRAFTING_STATION_USE_DISTANCE) / Settings.CHUNK_UNITS), Settings.BOARD_SIZE - 1);

   const availableCraftingStations = new Array<CraftingStation>();

   for (let chunkX = minChunkX; chunkX <= maxChunkX; chunkX++) {
      for (let chunkY = minChunkY; chunkY <= maxChunkY; chunkY++) {
         const chunk = Board.getChunk(chunkX, chunkY);
         for (const entity of chunk.entities) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            
            const distance = transformComponent.position.calculateDistanceBetween(entityTransformComponent.position);
            if (distance > Settings.MAX_CRAFTING_STATION_USE_DISTANCE) {
               continue;
            }

            switch (Board.getEntityType(entity)) {
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

export function onTribeMemberCollision(tribesman: EntityID, collidingEntity: EntityID): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.berryBush || collidingEntityType === EntityType.tree) {
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(tribesman);
      tribeMemberComponent.lastPlantCollisionTicks = Board.ticks;
   }
}

// @Cleanup: not for player. reflect in function name
export function onTribesmanCollision(tribesman: EntityID, collidingEntity: EntityID): void {
   if (Board.getEntityType(collidingEntity) === EntityType.itemEntity) {
      const itemComponent = ItemComponentArray.getComponent(collidingEntity);

      // Keep track of it beforehand as the amount variable gets changed when being picked up
      const itemAmount = itemComponent.amount;

      const wasPickedUp = pickupItemEntity(tribesman, collidingEntity);

      if (wasPickedUp && itemComponent.throwingEntity !== null && itemComponent.throwingEntity !== tribesman) {
         adjustTribesmanRelationsAfterGift(tribesman, itemComponent.throwingEntity, itemComponent.itemType, itemAmount);
      }
   }
}

export function throwItem(tribesman: EntityID, inventoryName: InventoryName, itemSlot: number, dropAmount: number, throwDirection: number): void {
   const inventoryComponent = InventoryComponentArray.getComponent(tribesman);
   const inventory = getInventory(inventoryComponent, inventoryName);

   const item = inventory.itemSlots[itemSlot];
   if (typeof item === "undefined") {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(tribesman);
   const tribesmanPhysicsComponent = PhysicsComponentArray.getComponent(tribesman);
   
   const itemType = item.type;
   const amountRemoved = consumeItemFromSlot(inventory, itemSlot, dropAmount);

   const dropPosition = transformComponent.position.copy();
   dropPosition.x += Vars.ITEM_THROW_OFFSET * Math.sin(throwDirection);
   dropPosition.y += Vars.ITEM_THROW_OFFSET * Math.cos(throwDirection);

   // Create the item entity
   const config = createItemEntityConfig();
   config[ServerComponentType.transform].position.x = dropPosition.x;
   config[ServerComponentType.transform].position.y = dropPosition.y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   // Throw the dropped item away from the player
   config[ServerComponentType.physics].velocityX = tribesmanPhysicsComponent.velocity.x + Vars.ITEM_THROW_FORCE * Math.sin(throwDirection);
   config[ServerComponentType.physics].velocityY = tribesmanPhysicsComponent.velocity.y + Vars.ITEM_THROW_FORCE * Math.cos(throwDirection);
   config[ServerComponentType.item].itemType = itemType;
   config[ServerComponentType.item].amount = amountRemoved;
   config[ServerComponentType.item].throwingEntity = tribesman;
   createEntityFromConfig(config);

   if (TribesmanAIComponentArray.hasComponent(tribesman)) {
      const tribesmanComponent = TribesmanAIComponentArray.getComponent(tribesman);
      tribesmanComponent.lastItemThrowTicks = Board.ticks;
   }
}

const isBerryBush = (entity: EntityID): boolean => {
   switch (Board.getEntityType(entity)) {
      case EntityType.berryBush: {
         return true;
      }
      case EntityType.plant: {
         const plantComponent = PlantComponentArray.getComponent(entity);
         return plantComponent.plantType === PlanterBoxPlant.berryBush;
      }
      default: {
         return false;
      }
   }
}