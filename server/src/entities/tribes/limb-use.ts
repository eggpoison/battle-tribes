import { HitFlags } from "webgl-test-shared/dist/client-server-types";
import { EntityID, LimbAction, EntityType, PlayerCauseOfDeath, EntityTypeString } from "webgl-test-shared/dist/entities";
import { AttackEffectiveness, calculateAttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { InventoryName, Item, ITEM_INFO_RECORD, ITEM_TYPE_RECORD, itemInfoIsTool, ItemType, ItemVars } from "webgl-test-shared/dist/items/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { Point } from "webgl-test-shared/dist/utils";
import Board from "../../Board";
import { damageEntity, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryComponentArray, getInventory } from "../../components/InventoryComponent";
import { InventoryUseComponentArray, LimbInfo } from "../../components/InventoryUseComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { applyStatusEffect } from "../../components/StatusEffectComponent";
import { TransformComponentArray } from "../../components/TransformComponent";
import { hasTitle } from "../../components/TribeMemberComponent";
import { getItemAttackCooldown } from "../../items";
import { getSwingTimeMultiplier, calculateItemDamage, repairBuilding } from "./tribe-member";
import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { PlantComponentArray, plantIsFullyGrown } from "../../components/PlantComponent";
import { TreeComponentArray, TREE_RADII } from "../../components/TreeComponent";
import { createEntityFromConfig } from "../../Entity";
import { createItemEntityConfig } from "../item-entity";
import { dropBerryOverEntity, BERRY_BUSH_RADIUS } from "../resources/berry-bush";
import { getEntityRelationship, EntityRelationship } from "../../components/TribeComponent";
import { DamageBoxWrapper } from "webgl-test-shared/dist/boxes/boxes";
import { ServerDamageBoxWrapper } from "../../boxes";

const enum Vars {
   DEFAULT_ATTACK_KNOCKBACK = 125
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

const calculateItemKnockback = (item: Item | null): number => {
   if (item === null) {
      return Vars.DEFAULT_ATTACK_KNOCKBACK;
   }

   const itemInfo = ITEM_INFO_RECORD[item.type];
   if (itemInfoIsTool(item.type, itemInfo)) {
      return itemInfo.knockback;
   }

   return Vars.DEFAULT_ATTACK_KNOCKBACK;
}

// @Cleanup: (?) Pass in the item to use directly instead of passing in the item slot and inventory name
// @Cleanup: Not just for tribe members, move to different file
const attemptAttack = (attackingEntity: EntityID, victim: EntityID, limbInfo: LimbInfo): boolean => {
   // @Cleanup: instead use getHeldItem
   // Find the selected item
   let item: Item | undefined | null = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   if (typeof item === "undefined" || limbInfo.thrownBattleaxeItemID === item.id) {
      item = null;
   }

   const targetEntityType = Board.getEntityType(victim)!;

   const attackEffectiveness = calculateAttackEffectiveness(item, targetEntityType);

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((item === null || item.type === ItemType.leaf) && (targetEntityType === EntityType.tree || targetEntityType === EntityType.berryBush || targetEntityType === EntityType.plant)) {
      const inventoryComponent = InventoryComponentArray.getComponent(attackingEntity);
      const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
      const gloves = gloveInventory.itemSlots[1];
      if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
         gatherPlant(victim, attackingEntity, gloves);
         return true;
      }
   }

   const attackDamage = calculateItemDamage(attackingEntity, item, attackEffectiveness);
   const attackKnockback = calculateItemKnockback(item);

   const targetEntityTransformComponent = TransformComponentArray.getComponent(victim);
   const attackerTransformComponent = TransformComponentArray.getComponent(attackingEntity);

   const hitDirection = attackerTransformComponent.position.calculateAngleBetween(targetEntityTransformComponent.position);

   // @Hack
   const collisionPoint = new Point((targetEntityTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (targetEntityTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   // Register the hit
   const hitFlags = item !== null && item.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0;
   damageEntity(victim, attackingEntity, attackDamage, PlayerCauseOfDeath.tribe_member, attackEffectiveness, collisionPoint, hitFlags);
   applyKnockback(victim, attackKnockback, hitDirection);

   if (item !== null && item.type === ItemType.flesh_sword) {
      applyStatusEffect(victim, StatusEffect.poisoned, 3 * Settings.TPS);
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attackingEntity, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(victim, StatusEffect.bleeding, 2 * Settings.TPS);
   }

   return true;
}

const getWindupTimeTicks = (attackingEntity: EntityID, itemSlot: number, inventoryName: InventoryName): number => {
   // Find the selected item
   const inventoryComponent = InventoryComponentArray.getComponent(attackingEntity);
   const inventory = getInventory(inventoryComponent, inventoryName);

   const item = inventory.itemSlots[itemSlot];
   if (typeof item !== "undefined") {
      const itemInfo = ITEM_INFO_RECORD[item.type];
      if (itemInfoIsTool(item.type, itemInfo)) {
         return itemInfo.attackWindupTimeTicks;
      }
   }

   return ItemVars.DEFAULT_ATTACK_WINDUP_TICKS;
}

export function beginSwing(attackingEntity: EntityID, itemSlot: number, inventoryName: InventoryName): boolean {
   // Global attack cooldown
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(attackingEntity);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      return false;
   }

   const limbInfo = inventoryUseComponent.getUseInfo(inventoryName);
   // If the limb is doing something, don't swing
   if (limbInfo.action !== LimbAction.none) {
      return false;
   }

   // Being winding up the attack
   limbInfo.selectedItemSlot = itemSlot;
   limbInfo.action = LimbAction.windAttack;
   // @Temporary
   limbInfo.lastAttackWindupTicks = Board.ticks;
   limbInfo.currentActionStartingTicks = Board.ticks;
   limbInfo.currentActionDurationTicks = getWindupTimeTicks(attackingEntity, itemSlot, inventoryName);

   // Swing was successful
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

export function onEntityLimbCollision(attackingEntity: EntityID, victim: EntityID, damageBox: ServerDamageBoxWrapper): void {
   // @Incomplete
   // const item = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   // if (typeof item !== "undefined" && ITEM_TYPE_RECORD[item.type] === "hammer") {
   //    // First look for friendly buildings to repair
   //    const repairTarget = calculateRepairTarget(player, attackTargets);
   //    if (repairTarget !== null) {
   //       return repairBuilding(player, repairTarget, itemSlot, inventoryName);
   //    }

   //    // Then look for attack targets
   //    const attackTarget = calculateAttackTarget(player, attackTargets, ~(EntityRelationship.friendly | EntityRelationship.friendlyBuilding));
   //    if (attackTarget !== null) {
   //       return attemptAttack(player, attackTarget, itemSlot, inventoryName);
   //    }

   //    // Then look for blueprints to work on
   //    const workTarget = calculateBlueprintWorkTarget(player, attackTargets);
   //    if (workTarget !== null) {
   //       return repairBuilding(player, workTarget, itemSlot, inventoryName);
   //    }

   //    return false;
   // }
   
   if (HealthComponentArray.hasComponent(victim)) {
      attemptAttack(attackingEntity, victim, damageBox.limbInfo);

      // @Hack
      damageBox.isRemoved = true;
   }
}