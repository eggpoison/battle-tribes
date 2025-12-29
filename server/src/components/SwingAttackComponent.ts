import { LimbState } from "../../../shared/src/attack-patterns";
import { assertBoxIsCircular, HitboxFlag } from "../../../shared/src/boxes/boxes";
import { HitFlags } from "../../../shared/src/client-server-types";
import { ServerComponentType } from "../../../shared/src/components";
import { DamageSource, Entity, EntityType } from "../../../shared/src/entities";
import { AttackEffectiveness, calculateAttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { getItemType, HammerItemType, InventoryName, Item, ITEM_INFO_RECORD, ItemType, itemTypeIsHammer } from "../../../shared/src/items/items";
import { Settings } from "../../../shared/src/settings";
import { StatusEffect } from "../../../shared/src/status-effects";
import { TribesmanTitle } from "../../../shared/src/titles";
import { lerp, Point, randAngle } from "../../../shared/src/utils";
import { HitboxCollisionPair } from "../collision-detection";
import { createItemEntityConfig } from "../entities/item-entity";
import { calculateItemKnockback } from "../entities/tribes/limb-use";
import { calculateItemDamage } from "../entities/tribes/tribe-member";
import { getHumanoidRadius } from "../entities/tribes/tribesman-ai/tribesman-ai-utils";
import { applyKnockback, Hitbox } from "../hitboxes";
import { createItem } from "../items";
import { createEntity, destroyEntity, entityExists, entityIsFlaggedForDestruction, getEntityLayer, getEntityType } from "../world";
import { BerryBushComponentArray } from "./BerryBushComponent";
import { BerryBushPlantedComponentArray } from "./BerryBushPlantedComponent";
import { doBlueprintWork } from "./BlueprintComponent";
import { ComponentArray } from "./ComponentArray";
import { damageEntity, healEntity, HealthComponentArray, hitEntityWithoutDamage } from "./HealthComponent";
import { InventoryComponentArray, hasInventory, getInventory } from "./InventoryComponent";
import { getCurrentLimbState, getHeldItem, LimbInfo } from "./InventoryUseComponent";
import { applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponent, TransformComponentArray } from "./TransformComponent";
import { entitiesBelongToSameTribe, EntityRelationship, getEntityRelationship, TribeComponentArray } from "./TribeComponent";
import { hasTitle } from "./TribesmanComponent";

export class SwingAttackComponent {
   public readonly owner: Entity;
   public readonly limb: LimbInfo;
   // @Cleanup: Is this necessary? Could we do it with just a tick event?
   public isBlocked = false;

   constructor(owner: Entity, limb: LimbInfo) {
      this.owner = owner;
      this.limb = limb;
   }
}

export const SwingAttackComponentArray = new ComponentArray<SwingAttackComponent>(ServerComponentType.swingAttack, true, getDataLength, addDataToPacket);
SwingAttackComponentArray.onTick = {
   func: onTick,
   tickInterval: 1
};
SwingAttackComponentArray.onEntityCollision = onEntityCollision;

// @Cleanup: not just used in this file!!
export function setHitboxToLimbState(ownerTransformComponent: TransformComponent, hitboxTransformComponent: TransformComponent, hitbox: Hitbox, limb: LimbState, isFlipped: boolean): void {
   const flipMultiplier = isFlipped ? -1 : 1;

   const offset = limb.extraOffset + getHumanoidRadius(ownerTransformComponent) + 2;

   const box = hitbox.box;
   box.offset.x = offset * Math.sin(limb.direction * flipMultiplier) + limb.extraOffsetX * flipMultiplier;
   box.offset.y = offset * Math.cos(limb.direction * flipMultiplier) + limb.extraOffsetY;
   // box.relativeAngle = limb.angle * flipMultiplier;

   hitboxTransformComponent.isDirty = true;
}

function onTick(swingAttack: Entity): void {
   const swingAttackTransformComponent = TransformComponentArray.getComponent(swingAttack);
   const limbHitbox = swingAttackTransformComponent.hitboxes[0];
   
   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const limb = swingAttackComponent.limb;

   // @HACK @TEMPORARY! here cuz somtimes ownerTransformComponent is undefined (???) which crashes the server
   if (!entityExists(swingAttackComponent.owner)) {
      return;
   }

   const isFlipped = limb.associatedInventory.name === InventoryName.offhand;
   const ownerTransformComponent = TransformComponentArray.getComponent(swingAttackComponent.owner);
   setHitboxToLimbState(ownerTransformComponent, swingAttackTransformComponent, limbHitbox, getCurrentLimbState(limb), isFlipped);
   
   const progress = limb.currentActionElapsedTicks / limb.currentActionDurationTicks;
   // @HACK @INCOMPLETE
   limbHitbox.box.relativeAngle = lerp(0, -1, progress);
   // limbHitbox.box.relativeAngle = lerp(limb.currentActionStartLimbState.angle, limb.currentActionEndLimbState.angle, progress);
   // console.log(lerp(limb.currentActionStartLimbState.angle, limb.currentActionEndLimbState.angle, progress));
}

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

const shouldRepairBuilding = (entity: Entity, comparingEntity: Entity): boolean => {
   if (getEntityRelationship(entity, comparingEntity) !== EntityRelationship.friendlyBuilding) {
      return false;
   }

   if (!entitiesBelongToSameTribe(entity, comparingEntity)) {
      return false;
   }

   const healthComponent = HealthComponentArray.getComponent(comparingEntity);
   return healthComponent.health < healthComponent.maxHealth;
}

const getRepairAmount = (tribeMember: Entity, itemType: HammerItemType): number => {
   const itemInfo = ITEM_INFO_RECORD[itemType];
   let repairAmount = itemInfo.repairAmount;

   if (hasTitle(tribeMember, TribesmanTitle.builder)) {
      repairAmount *= 1.5;
   }
   
   return Math.round(repairAmount);
}

const isBerryBushWithBerries = (entity: Entity): boolean => {
   switch (getEntityType(entity)) {
      case EntityType.berryBush: {
         const berryBushComponent = BerryBushComponentArray.getComponent(entity);
         return berryBushComponent.numBerries > 0;
      }
      case EntityType.berryBushPlanted: {
         const berryBushPlantedComponent = BerryBushPlantedComponentArray.getComponent(entity);
         return berryBushPlantedComponent.numFruit > 0;
      }
      default: {
         return false;
      }
   }
}

const getPlantGatherAmount = (tribeman: Entity, plant: Entity, gloves: Item | null): number => {
   let amount = 1;

   const entityType = getEntityType(plant);
   if (hasTitle(tribeman, TribesmanTitle.berrymuncher) && (entityType === EntityType.berryBush || entityType === EntityType.berryBushPlanted)) {
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

const gatherPlant = (plant: Entity, attacker: Entity, hitHitbox: Hitbox, gloves: Item | null): void => {
   const plantTransformComponent = TransformComponentArray.getComponent(plant);
   const plantHitbox = plantTransformComponent.hitboxes[0];
   
   if (isBerryBushWithBerries(plant)) {
      const gatherMultiplier = getPlantGatherAmount(attacker, plant, gloves);

      // As hitting the bush will drop a berry regardless, only drop extra ones here
      for (let i = 0; i < gatherMultiplier - 1; i++) {
         // @HACK: hit position
         hitEntityWithoutDamage(plant, hitHitbox, attacker, new Point(0, 0));
      }
   } else {
      assertBoxIsCircular(plantHitbox.box);
      const plantRadius = plantHitbox.box.radius;

      const offsetDirection = randAngle();
      const x = plantHitbox.box.position.x + (plantRadius - 7) * Math.sin(offsetDirection);
      const y = plantHitbox.box.position.y + (plantRadius - 7) * Math.cos(offsetDirection);
   
      const config = createItemEntityConfig(new Point(x, y), randAngle(), createItem(ItemType.leaf, 1, "", ""), null);
      createEntity(config, getEntityLayer(plant), 0);

      hitEntityWithoutDamage(plant, hitHitbox, attacker, new Point(0, 0));
   }

   // @Hack
   // const attackerTransformComponent = TransformComponentArray.getComponent(attacker);
   // const collisionPoint = new Point((plantHitbox.box.position.x + attackerTransformComponent.position.x) / 2, (plantHitbox.box.position.y + attackerTransformComponent.position.y) / 2);
   // @HACK
   const collisionPoint = new Point(0, 0);

   damageEntity(plantHitbox, attacker, 0, 0, AttackEffectiveness.ineffective, collisionPoint, HitFlags.NON_DAMAGING_HIT);
}

const damageEntityFromSwing = (swingAttack: Entity, victim: Entity, hitHitbox: Hitbox, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): boolean => {
   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const attacker = swingAttackComponent.owner;
   const attackingLimb = swingAttackComponent.limb;
   
   const attackingItem = getHeldItem(attackingLimb);

   const targetEntityType = getEntityType(victim);

   const attackEffectiveness = calculateAttackEffectiveness(attackingItem, targetEntityType);

   // Harvest leaves from trees and berries when wearing the gathering or gardening gloves
   if ((attackingItem === null || attackingItem.type === ItemType.leaf) && (targetEntityType === EntityType.tree || targetEntityType === EntityType.berryBush || targetEntityType === EntityType.treePlanted || targetEntityType === EntityType.berryBushPlanted)) {
      const inventoryComponent = InventoryComponentArray.getComponent(attacker);
      if (hasInventory(inventoryComponent, InventoryName.gloveSlot)) {
         const gloveInventory = getInventory(inventoryComponent, InventoryName.gloveSlot);
         const gloves = gloveInventory.itemSlots[1];
         if (typeof gloves !== "undefined" && (gloves.type === ItemType.gathering_gloves || gloves.type === ItemType.gardening_gloves)) {
            gatherPlant(victim, attacker, hitHitbox, gloves);
            return true;
         }
      }
   }

   const attackDamage = calculateItemDamage(attacker, attackingItem, attackEffectiveness, swingAttackComponent.isBlocked);
   const attackKnockback = calculateItemKnockback(attackingItem, swingAttackComponent.isBlocked);

   let hitDirection = 0;
   for (const hitboxPair of collidingHitboxPairs) {
      const affectedHitbox = hitboxPair.affectedHitbox;
      const collidingHitbox = hitboxPair.collidingHitbox;
      hitDirection += affectedHitbox.box.position.angleTo(collidingHitbox.box.position);
   }
   hitDirection /= collidingHitboxPairs.length;

   // @Hack
   const firstHitboxPair = collidingHitboxPairs[0];

   const victimHitbox = firstHitboxPair.collidingHitbox;
   const collisionPoint = new Point((victimHitbox.box.position.x + victimHitbox.box.position.x) / 2, (victimHitbox.box.position.y + victimHitbox.box.position.y) / 2);

   // Register the hit
   const hitFlags = attackingItem !== null && attackingItem.type === ItemType.flesh_sword ? HitFlags.HIT_BY_FLESH_SWORD : 0;
   damageEntity(victimHitbox, attacker, attackDamage, DamageSource.tribeMember, attackEffectiveness, collisionPoint, hitFlags);
   // @SQUEAM
   if (getEntityType(victimHitbox.entity) === EntityType.tukmokTailClub || victimHitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_MEDIUM) || victimHitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_BIG) || victimHitbox.flags.includes(HitboxFlag.TUKMOK_TAIL_MIDDLE_SEGMENT_SMALL)) {

   } else {
      applyKnockback(victimHitbox, attackKnockback, hitDirection);
   }

   if (attackingItem !== null) {
      // @HACK: shouldn't be hard-coded here!!
      switch (attackingItem.type) {
         case ItemType.flesh_sword: {
            applyStatusEffect(victim, StatusEffect.poisoned, 3 * Settings.TICK_RATE);
            break;
         }
         case ItemType.inguSerpentTooth:
         case ItemType.iceWringer: {
            applyStatusEffect(victim, StatusEffect.freezing, 3 * Settings.TICK_RATE);
            break;
         }
      }
   }

   // Bloodaxes have a 20% chance to inflict bleeding on hit
   if (hasTitle(attacker, TribesmanTitle.bloodaxe) && Math.random() < 0.2) {
      applyStatusEffect(victim, StatusEffect.bleeding, 2 * Settings.TICK_RATE);
   }

   return true;
}

function onEntityCollision(swingAttack: Entity, collidingEntity: Entity, collidingHitboxPairs: ReadonlyArray<HitboxCollisionPair>): void {
   // If the swing attack is finished, don't attack anymore
   if (entityIsFlaggedForDestruction(swingAttack)) {
      return;
   }
   
   const swingAttackComponent = SwingAttackComponentArray.getComponent(swingAttack);
   const owner = swingAttackComponent.owner;
   // @Temporary: remove when bug is fixed
   if (!entityExists(owner)) {
      // @TEMPORARY
      // console.warn("OUSEOFJHOSJFOISDJF bad")
      return;
   }
   // @Temporary: remove when bug is fixed
   // @Bug: Happens when a zombie swings !!!
   if (!TribeComponentArray.hasComponent(owner)) {
      // @TEMPORARY
      // console.log(getEntityType(owner));
      // console.warn(getEntityType(owner));
      return;
   }
   
   // Build blueprints and repair buildings
   const swingItemType = getItemType(getHeldItem(swingAttackComponent.limb));
   if (swingItemType !== null && itemTypeIsHammer(swingItemType)) {
      if (getEntityType(collidingEntity) === EntityType.blueprintEntity) {
         if (entitiesBelongToSameTribe(owner, collidingEntity)) {
            doBlueprintWork(collidingEntity, swingItemType);
            destroyEntity(swingAttack);
            return;
         }
      } else if (shouldRepairBuilding(owner, collidingEntity)) {
         const repairAmount = getRepairAmount(owner, swingItemType);
         healEntity(collidingEntity, repairAmount, owner);
         destroyEntity(swingAttack);
         return;
      }
   }

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't attack friendlies
   const relationship = getEntityRelationship(owner, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }

   damageEntityFromSwing(swingAttack, collidingEntity, collidingHitboxPairs[0].collidingHitbox, collidingHitboxPairs);

   destroyEntity(swingAttack);
}