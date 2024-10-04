import { HitFlags } from "battletribes-shared/client-server-types";
import { EntityID, LimbAction, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { AttackEffectiveness, calculateAttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { getItemAttackInfo, InventoryName, Item, ITEM_INFO_RECORD, itemInfoIsTool, ItemType } from "battletribes-shared/items/items";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { TribesmanTitle } from "battletribes-shared/titles";
import { Point } from "battletribes-shared/utils";
import Layer from "../../Layer";
import { damageEntity, HealthComponentArray } from "../../components/HealthComponent";
import { InventoryComponentArray, getInventory } from "../../components/InventoryComponent";
import { getHeldItem, InventoryUseComponentArray, LimbInfo } from "../../components/InventoryUseComponent";
import { applyKnockback, PhysicsComponentArray } from "../../components/PhysicsComponent";
import { applyStatusEffect } from "../../components/StatusEffectComponent";
import { TransformComponentArray } from "../../components/TransformComponent";
import { hasTitle } from "../../components/TribeMemberComponent";
import { calculateItemDamage } from "./tribe-member";
import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { BerryBushComponentArray } from "../../components/BerryBushComponent";
import { PlantComponentArray, plantIsFullyGrown } from "../../components/PlantComponent";
import { TreeComponentArray, TREE_RADII } from "../../components/TreeComponent";
import { createEntityFromConfig } from "../../Entity";
import { createItemEntityConfig } from "../item-entity";
import { dropBerryOverEntity, BERRY_BUSH_RADIUS } from "../resources/berry-bush";
import { getEntityRelationship, EntityRelationship } from "../../components/TribeComponent";
import { AttackVars, copyLimbState, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, TRIBESMAN_RESTING_LIMB_STATE } from "../../../../shared/src/attack-patterns";
import { getEntityLayer, getEntityType } from "../../world";

const enum Vars {
   DEFAULT_ATTACK_KNOCKBACK = 125
}

const isBerryBushWithBerries = (entity: EntityID): boolean => {
   switch (getEntityType(entity)) {
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
   switch (getEntityType(entity)) {
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
      switch (getEntityType(plant)) {
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
      createEntityFromConfig(config, getEntityLayer(plant), 0);
   }

   // @Hack
   const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
   const collisionPoint = new Point((plantTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (plantTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   damageEntity(plant, attacker, 0, 0, AttackEffectiveness.ineffective, collisionPoint, HitFlags.NON_DAMAGING_HIT);
}

const getBaseItemKnockback = (item: Item | null): number => {
   if (item === null) {
      return Vars.DEFAULT_ATTACK_KNOCKBACK;
   }

   const itemInfo = ITEM_INFO_RECORD[item.type];
   if (itemInfoIsTool(item.type, itemInfo)) {
      return itemInfo.knockback;
   }

   return Vars.DEFAULT_ATTACK_KNOCKBACK;
}

export function calculateItemKnockback(item: Item | null, attackIsBlocked: boolean): number {
   let knockback = getBaseItemKnockback(item);
   
   if (attackIsBlocked) {
      knockback *= 0.5;
   }
   
   return knockback;
}

// @Cleanup: (?) Pass in the item to use directly instead of passing in the item slot and inventory name
export function attemptAttack(attacker: EntityID, victim: EntityID, limbInfo: LimbInfo): boolean {
   // @Cleanup: instead use getHeldItem
   // Find the selected item
   let item: Item | undefined | null = limbInfo.associatedInventory.itemSlots[limbInfo.selectedItemSlot];
   if (typeof item === "undefined" || limbInfo.thrownBattleaxeItemID === item.id) {
      item = null;
   }

   const targetEntityType = getEntityType(victim)!;

   const attackEffectiveness = calculateAttackEffectiveness(item, targetEntityType);

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((item === null || item.type === ItemType.leaf) && (targetEntityType === EntityType.tree || targetEntityType === EntityType.berryBush || targetEntityType === EntityType.plant)) {
      const inventoryComponent = InventoryComponentArray.getComponent(attacker);
      const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
      const gloves = gloveInventory.itemSlots[1];
      if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
         gatherPlant(victim, attacker, gloves);
         return true;
      }
   }

   const attackIsBlocked = limbInfo.limbDamageBox.isBlocked;

   const attackDamage = calculateItemDamage(attacker, item, attackEffectiveness, attackIsBlocked);
   const attackKnockback = calculateItemKnockback(item, attackIsBlocked);

   const targetEntityTransformComponent = TransformComponentArray.getComponent(victim);
   const attackerTransformComponent = TransformComponentArray.getComponent(attacker);

   const hitDirection = attackerTransformComponent.position.calculateAngleBetween(targetEntityTransformComponent.position);

   // @Hack
   const collisionPoint = new Point((targetEntityTransformComponent.position.x + attackerTransformComponent.position.x) / 2, (targetEntityTransformComponent.position.y + attackerTransformComponent.position.y) / 2);

   // Register the hit
   const hitFlags = item !== null && item.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0;
   damageEntity(victim, attacker, attackDamage, PlayerCauseOfDeath.tribe_member, attackEffectiveness, collisionPoint, hitFlags);
   applyKnockback(victim, attackKnockback, hitDirection);

   if (item !== null && item.type === ItemType.flesh_sword) {
      applyStatusEffect(victim, StatusEffect.poisoned, 3 * Settings.TPS);
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attacker, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(victim, StatusEffect.bleeding, 2 * Settings.TPS);
   }

   return true;
}

export function beginSwing(attackingEntity: EntityID, itemSlot: number, inventoryName: InventoryName): boolean {
   // Global attack cooldown
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(attackingEntity);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      return false;
   }

   const limb = inventoryUseComponent.getLimbInfo(inventoryName);

   const heldItem = getHeldItem(limb);
   const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
   
   // Shield bash
   if (heldItemAttackInfo.attackPattern === null) {
      if (limb.action === LimbAction.block) {
         limb.selectedItemSlot = itemSlot;
         limb.action = LimbAction.windShieldBash;
         limb.currentActionElapsedTicks = 0;
         limb.currentActionDurationTicks = AttackVars.SHIELD_BASH_WINDUP_TIME_TICKS;
         limb.currentActionRate = 1;
         // @Speed: Garbage collection
         limb.currentActionStartLimbState = copyLimbState(SHIELD_BLOCKING_LIMB_STATE);
         // @Speed: Garbage collection
         limb.currentActionEndLimbState = copyLimbState(SHIELD_BASH_WIND_UP_LIMB_STATE);
      }
      return false;
   }

   // If the limb is doing something or is resting, don't swing
   if (limb.action !== LimbAction.none || limb.currentActionElapsedTicks < limb.currentActionDurationTicks) {
      return false;
   }
   
   // Begin winding up the attack
   limb.selectedItemSlot = itemSlot;
   limb.action = LimbAction.windAttack;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.windupTimeTicks;
   limb.currentActionRate = 1;
   // @Speed: Garbage collection
   limb.currentActionStartLimbState = copyLimbState(TRIBESMAN_RESTING_LIMB_STATE);
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(heldItemAttackInfo.attackPattern.windedBack);

   const physicsComponent = PhysicsComponentArray.getComponent(attackingEntity);

   // Add extra range for moving attacks
   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   if (vx !== 0 || vy !== 0) {
      const transformComponent = TransformComponentArray.getComponent(attackingEntity);
      const velocityMagnitude = Math.sqrt(vx * vx + vy * vy);
      const attackAlignment = (vx * Math.sin(transformComponent.rotation) + vy * Math.cos(transformComponent.rotation)) / velocityMagnitude;
      if (attackAlignment > 0) {
         const extraAmount = AttackVars.MAX_EXTRA_ATTACK_RANGE * Math.min(velocityMagnitude / AttackVars.MAX_EXTRA_ATTACK_RANGE_SPEED);
         limb.currentActionEndLimbState.extraOffsetY += extraAmount;
      }
   }

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
      const targetEntityType = getEntityType(targetEntity)!;
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
      if (getEntityType(targetEntity) !== EntityType.blueprintEntity) {
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