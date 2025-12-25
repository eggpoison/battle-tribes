import { Entity, LimbAction } from "battletribes-shared/entities";
import { getItemAttackInfo, InventoryName, Item, ITEM_INFO_RECORD, itemInfoIsTool } from "battletribes-shared/items/items";
import { getHeldItem, getLimbConfiguration, InventoryUseComponentArray } from "../../components/InventoryUseComponent";
import { TransformComponentArray } from "../../components/TransformComponent";
import { AttackVars, copyLimbState, SHIELD_BASH_WIND_UP_LIMB_STATE, SHIELD_BLOCKING_LIMB_STATE, RESTING_LIMB_STATES } from "battletribes-shared/attack-patterns";
import { getHitboxVelocity, Hitbox } from "../../hitboxes";

const enum Vars {
   DEFAULT_ATTACK_KNOCKBACK = 125
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

export function beginSwing(attackingEntity: Entity, itemSlot: number, inventoryName: InventoryName): boolean {
   // Global attack cooldown
   const inventoryUseComponent = InventoryUseComponentArray.getComponent(attackingEntity);
   if (inventoryUseComponent.globalAttackCooldown > 0) {
      return false;
   }

   const limb = inventoryUseComponent.getLimbInfo(inventoryName);

   const heldItem = getHeldItem(limb);
   const heldItemAttackInfo = getItemAttackInfo(heldItem !== null ? heldItem.type : null);
   
   // Shield bash
   if (heldItemAttackInfo.attackPatterns === null) {
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
   // This has 1 tick of leniency to reduce the chance of someone attacking which is ok client-side but they're still waiting 1 tick for their previous swing to finish server-side
   if (limb.action !== LimbAction.none || limb.currentActionElapsedTicks < limb.currentActionDurationTicks - 1) {
      return false;
   }

   const limbConfiguration = getLimbConfiguration(inventoryUseComponent);
   const attackPattern = heldItemAttackInfo.attackPatterns![limbConfiguration];
   
   // Begin winding up the attack
   limb.selectedItemSlot = itemSlot;
   limb.action = LimbAction.windAttack;
   limb.currentActionElapsedTicks = 0;
   limb.currentActionDurationTicks = heldItemAttackInfo.attackTimings.windupTimeTicks;
   limb.currentActionRate = 1;
   // @Speed: Garbage collection
   limb.currentActionStartLimbState = copyLimbState(RESTING_LIMB_STATES[limbConfiguration]);
   // @Speed: Garbage collection
   limb.currentActionEndLimbState = copyLimbState(attackPattern.windedBack);

   // @Incomplete
   // limb.heldItemDamageBox.wallSubtileDamageGiven = 0;
   
   // limb.limbDamageBox.isBlockedByWall = false;
   // limb.heldItemDamageBox.isBlockedByWall = false;

   const transformComponent = TransformComponentArray.getComponent(attackingEntity);
   const attackingEntityHitbox = transformComponent.hitboxes[0];

   // Add extra range for moving attacks
   const velocity = getHitboxVelocity(attackingEntityHitbox);
   const velocityMagnitude = velocity.magnitude();

   const attackAlignment = (velocity.x * Math.sin(attackingEntityHitbox.box.angle) + velocity.y * Math.cos(attackingEntityHitbox.box.angle)) / velocityMagnitude;
   if (attackAlignment > 0) {
      const extraAmount = AttackVars.MAX_EXTRA_ATTACK_RANGE * Math.min(velocityMagnitude / AttackVars.MAX_EXTRA_ATTACK_RANGE_SPEED);
      limb.currentActionEndLimbState.extraOffsetY += extraAmount;
   }

   // Swing was successful
   return true;
}

// @Incomplete
// export function calculateRepairTarget(tribeMember: Entity, targetEntities: ReadonlyArray<Entity>): Entity | null {
//    const transformComponent = TransformComponentArray.getComponent(tribeMember);

//    let closestEntity: Entity | null = null;
//    let minDistance = Number.MAX_SAFE_INTEGER;
//    for (const targetEntity of targetEntities) {
//       // Don't attack entities without health components
//       if (!HealthComponentArray.hasComponent(targetEntity)) {
//          continue;
//       }

//       // Only repair damaged buildings
//       const healthComponent = HealthComponentArray.getComponent(targetEntity);
//       if (healthComponent.health === healthComponent.maxHealth) {
//          continue;
//       }

//       const relationship = getEntityRelationship(tribeMember, targetEntity);
//       if (relationship !== EntityRelationship.friendlyBuilding) {
//          continue;
//       }

//       const targetEntityTransformComponent = TransformComponentArray.getComponent(targetEntity);

//       const dist = transformComponent.position.distanceTo(targetEntityTransformComponent.position);
//       if (dist < minDistance) {
//          closestEntity = targetEntity;
//          minDistance = dist;
//       }
//    }
   
//    if (closestEntity === null) return null;

//    return closestEntity;
// }

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