import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { Entity, EntityType, DamageSource } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { InventoryName, ItemType } from "battletribes-shared/items/items";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, polarVec2, randFloat, UtilVars } from "battletribes-shared/utils";
import { moveEntityToPosition, runHerdAI } from "../ai-shared";
import { AIHelperComponent, AIHelperComponentArray } from "./AIHelperComponent";
import { addLocalInvulnerabilityHash, canDamageEntity, damageEntity, healEntity, HealthComponentArray } from "./HealthComponent";
import { ItemComponentArray } from "./ItemComponent";
import { StatusEffectComponentArray, hasStatusEffect, applyStatusEffect } from "./StatusEffectComponent";
import { TransformComponentArray } from "./TransformComponent";
import { calculateRadialAttackTargets } from "../entities/tribes/tribe-member";
import { InventoryComponentArray, getInventory, pickupItemEntity } from "./InventoryComponent";
import { InventoryUseComponentArray } from "./InventoryUseComponent";
import { TribeMemberComponentArray } from "./TribeMemberComponent";
import { ZombieVars } from "../entities/mobs/zombie";
import { beginSwing } from "../entities/tribes/limb-use";
import { destroyEntity, entityExists, getEntityType, getGameTicks, isNight } from "../world";
import { AttackEffectiveness } from "../../../shared/src/entity-damage-types";
import { TombstoneComponentArray } from "./TombstoneComponent";
import { entityIsStructure } from "../../../shared/src/structures";
import { applyAbsoluteKnockback, applyAccelerationFromGround, applyKnockback, Hitbox } from "../hitboxes";
import { entitiesAreColliding, CollisionVars } from "../collision-detection";

const enum Vars {
   TURN_SPEED = 3 * UtilVars.PI,

   ACCELERATION = 275,
   ACCELERATION_SLOW = 150,

   /** Chance for a zombie to spontaneously combust every second */
   SPONTANEOUS_COMBUSTION_CHANCE = 0.5,

   ATTACK_OFFSET = 40,
   ATTACK_RADIUS = 30,

   // Herd AI constants
   TURN_RATE = 0.8,
   // @Speed: Don't need to calculate separation at all
   MIN_SEPARATION_DISTANCE = 0,
   SEPARATION_INFLUENCE = 0.3,
   ALIGNMENT_INFLUENCE = 0.7,
   COHESION_INFLUENCE = 0.3,

   /** The time in ticks after being hit that the zombie will move towards the source of damage */
   DAMAGE_INVESTIGATE_TIME_TICKS = (0.8 * Settings.TICK_RATE) | 0,

   HURT_ENTITY_INVESTIGATE_TICKS = (1 * Settings.TICK_RATE) | 0
}

export class ZombieComponent {
   /** The type of the zombie, 0-3 */
   public readonly zombieType: number;
   public readonly tombstone: Entity;

   /** Maps the IDs of entities which have attacked the zombie to the number of ticks that they should remain in the object for */
   public readonly attackingEntityIDs: Partial<Record<number, number>> = {};

   /** Cooldown before the zombie can do another attack */
   public attackCooldownTicks = 0;

   public visibleHurtEntityID = 0;
   /** Ticks since the visible hurt entity was last hit */
   public visibleHurtEntityTicks = 0;
   
   constructor(zombieType: number, tombstone: Entity) {
      this.zombieType = zombieType;
      this.tombstone = tombstone;
   }
}

export const ZombieComponentArray = new ComponentArray<ZombieComponent>(ServerComponentType.zombie, true, getDataLength, addDataToPacket);
ZombieComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
ZombieComponentArray.onHitboxCollision = onHitboxCollision;
ZombieComponentArray.preRemove = preRemove;
ZombieComponentArray.onTakeDamage = onTakeDamage;

const tribesmanIsWearingMeatSuit = (entityID: number): boolean => {
   const inventoryComponent = InventoryComponentArray.getComponent(entityID);
   const armourInventory = getInventory(inventoryComponent, InventoryName.armourSlot);

   const armour = armourInventory.itemSlots[1];
   return typeof armour !== "undefined" && armour.type === ItemType.meat_suit;
}

export function zombieShouldAttackEntity(zombie: Entity, entity: Entity): boolean {
   if (!HealthComponentArray.hasComponent(entity)) {
      return false;
   }
   
   // If the entity is attacking the zombie, attack back
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   if (typeof zombieComponent.attackingEntityIDs[entity] !== "undefined") {
      return true;
   }

   // Attack tribe members, but only if they aren't wearing a meat suit
   if (TribeMemberComponentArray.hasComponent(entity) && !tribesmanIsWearingMeatSuit(entity)) {
      return true;
   }

   const entityType = getEntityType(entity);
   return entityIsStructure(entityType);
}

const getTarget = (zombie: Entity, aiHelperComponent: AIHelperComponent): Entity | null => {
   const transformComponent = TransformComponentArray.getComponent(zombie);
   const zombieHitbox = transformComponent.hitboxes[0];
   
   // Attack the closest target in vision range
   let minDist = Number.MAX_SAFE_INTEGER;
   let target: Entity | null = null;
   for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
      const entity = aiHelperComponent.visibleEntities[i];
      if (zombieShouldAttackEntity(zombie, entity)) {
         const entityTransformComponent = TransformComponentArray.getComponent(entity);
         const entityHitbox = entityTransformComponent.hitboxes[0];
         
         const distance = zombieHitbox.box.position.distanceTo(entityHitbox.box.position);
         if (distance < minDist) {
            minDist = distance;
            target = entity;
         }
      }
   }

   if (target !== null) {
      return target;
   }

   const zombieComponent = ZombieComponentArray.getComponent(zombie);

   // Investigate recent hits
   let mostRecentHitTicks = ZombieVars.CHASE_PURSUE_TIME_TICKS - Vars.DAMAGE_INVESTIGATE_TIME_TICKS - 1;
   let damageSourceEntity: Entity | null = null;
   // @Speed
   for (const attackingEntity of Object.keys(zombieComponent.attackingEntityIDs).map(idString => Number(idString))) {
      const hitTicks = zombieComponent.attackingEntityIDs[attackingEntity]!;
      if (hitTicks > mostRecentHitTicks) {
         mostRecentHitTicks = hitTicks;
         damageSourceEntity = attackingEntity;
      }
   }

   return damageSourceEntity;
}

const doMeleeAttack = (zombie: Entity, target: Entity): void => {
   // @Cleanup: THIS BE SHITE!! Should work the same as the tribesman attack AI.
   // Find the attack target
   const attackTargets = calculateRadialAttackTargets(zombie, Vars.ATTACK_OFFSET, Vars.ATTACK_RADIUS);

   // Register the hit
   if (attackTargets.includes(target)) {
      // @Incomplete
      // attemptAttack(zombie, target, 1, InventoryName.handSlot);
      beginSwing(zombie, 1, InventoryName.handSlot);

      // Reset attack cooldown
      const zombieComponent = ZombieComponentArray.getComponent(zombie);
      zombieComponent.attackCooldownTicks = Math.floor(randFloat(1, 2) * Settings.TICK_RATE);
   }
}

// @Incomplete: bite wind-up

const doBiteAttack = (zombie: Entity, target: Entity): void => {
   const transformComponent = TransformComponentArray.getComponent(zombie);
   const zombieHitbox = transformComponent.hitboxes[0];
   
   const targetTransformComponent = TransformComponentArray.getComponent(target);
   const targetHitbox = targetTransformComponent.hitboxes[0];
   
   // Lunge at the target
   const lungeDir = zombieHitbox.box.position.angleTo(targetHitbox.box.position);
   applyAbsoluteKnockback(zombieHitbox, polarVec2(130, lungeDir));

   // Reset attack cooldown
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   zombieComponent.attackCooldownTicks = Math.floor(randFloat(3, 4) * Settings.TICK_RATE);

   const inventoryUseComponent = InventoryUseComponentArray.getComponent(zombie);

   const mainHandUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.handSlot);
   mainHandUseInfo.lastAttackTicks = getGameTicks();

   if (inventoryUseComponent.hasUseInfo(InventoryName.offhand)) {
      const offhandUseInfo = inventoryUseComponent.getLimbInfo(InventoryName.offhand);
      offhandUseInfo.lastAttackTicks = getGameTicks();
   }
}

const doAttack = (zombie: Entity, target: Entity): void => {
   const inventoryComponent = InventoryComponentArray.getComponent(zombie);

   // If holding an item, do a melee attack
   const handInventory = getInventory(inventoryComponent, InventoryName.handSlot);
   if (typeof handInventory.itemSlots[1] !== "undefined") {
      doMeleeAttack(zombie, target);
   } else {
      doBiteAttack(zombie, target);
   }
}

const findHerdMembers = (visibleEntities: ReadonlyArray<Entity>): ReadonlyArray<Entity> => {
   const herdMembers = new Array<Entity>();
   for (let i = 0; i < visibleEntities.length; i++) {
      const entity = visibleEntities[i];
      if (getEntityType(entity) === EntityType.zombie) {
         herdMembers.push(entity);
      }
   }
   return herdMembers;
}

function onTick(zombie: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   zombieComponent.visibleHurtEntityTicks++;

   // Update attacking entities
   // @Speed
   for (const attackingEntity of Object.keys(zombieComponent.attackingEntityIDs).map(idString => Number(idString))) {
      if (!entityExists(attackingEntity) || --zombieComponent.attackingEntityIDs[attackingEntity]! <= 0) {
         delete zombieComponent.attackingEntityIDs[attackingEntity];
      }
   }

   // If day time, ignite
   if (!isNight()) {
      // Ignite randomly or stay on fire if already on fire
      const statusEffectComponent = StatusEffectComponentArray.getComponent(zombie);
      if (hasStatusEffect(statusEffectComponent, StatusEffect.burning) || Math.random() < Vars.SPONTANEOUS_COMBUSTION_CHANCE * Settings.DT_S) {
         applyStatusEffect(zombie, StatusEffect.burning, 5 * Settings.TICK_RATE);
      }
   }

   const aiHelperComponent = AIHelperComponentArray.getComponent(zombie);

   const attackTarget = getTarget(zombie, aiHelperComponent);
   if (attackTarget !== null) {
      if (zombieComponent.attackCooldownTicks > 0) {
         zombieComponent.attackCooldownTicks--;
      } else {
         // Do special attack
         doAttack(zombie, attackTarget);
      }
      
      const targetTransformComponent = TransformComponentArray.getComponent(attackTarget);
      const targetHitbox = targetTransformComponent.hitboxes[0];
      
      moveEntityToPosition(zombie, targetHitbox.box.position.x, targetHitbox.box.position.y, Vars.ACCELERATION, Vars.TURN_SPEED, 1);
      
      return;
   } else {
      zombieComponent.attackCooldownTicks = Math.floor(2.5 * Settings.TICK_RATE);
   }

   const transformComponent = TransformComponentArray.getComponent(zombie);
   const zombieHitbox = transformComponent.hitboxes[0];

   // Eat raw beef and fish
   {
      let minDist = Number.MAX_SAFE_INTEGER;
      let closestFoodItem: Entity | null = null;
      for (let i = 0; i < aiHelperComponent.visibleEntities.length; i++) {
         const entity = aiHelperComponent.visibleEntities[i];
         if (getEntityType(entity) !== EntityType.itemEntity) {
            continue;
         }

         const itemComponent = ItemComponentArray.getComponent(entity);
         const item = itemComponent.item;
         if (item.type === ItemType.raw_beef || item.type === ItemType.raw_fish) {
            const entityTransformComponent = TransformComponentArray.getComponent(entity);
            const entityHitbox = entityTransformComponent.hitboxes[0];
            
            const distance = zombieHitbox.box.position.distanceTo(entityHitbox.box.position);
            if (distance < minDist) {
               minDist = distance;
               closestFoodItem = entity;
            }
         }
      }
      if (closestFoodItem !== null) {
         const foodTransformComponent = TransformComponentArray.getComponent(closestFoodItem);
         const foodHitbox = foodTransformComponent.hitboxes[0];
         
         moveEntityToPosition(zombie, foodHitbox.box.position.x, foodHitbox.box.position.y, Vars.ACCELERATION, Vars.TURN_SPEED, 1);

         if (entitiesAreColliding(zombie, closestFoodItem) !== CollisionVars.NO_COLLISION) {
            healEntity(zombie, 3, zombie);
            destroyEntity(closestFoodItem);
         }
         return;
      }
   }

   // Investigate hurt entities
   if (zombieComponent.visibleHurtEntityTicks < Vars.HURT_ENTITY_INVESTIGATE_TICKS) {
      const hurtEntity = zombieComponent.visibleHurtEntityID;
      if (entityExists(hurtEntity)) {
         const hurtEntityTransformComponent = TransformComponentArray.getComponent(hurtEntity);
         const hurtEntityHitbox = hurtEntityTransformComponent.hitboxes[0];
         
         moveEntityToPosition(zombie, hurtEntityHitbox.box.position.x, hurtEntityHitbox.box.position.y, Vars.ACCELERATION_SLOW, Vars.TURN_SPEED, 1);
         return;
      }
   }

   // Don't do herd AI if the zombie was attacked recently
   if (Object.keys(zombieComponent.attackingEntityIDs).length === 0) {
      // Herd AI
      const herdMembers = findHerdMembers(aiHelperComponent.visibleEntities);
      if (herdMembers.length > 1) {
         runHerdAI(zombie, herdMembers, ZombieVars.VISION_RANGE, Vars.TURN_RATE, Vars.MIN_SEPARATION_DISTANCE, Vars.SEPARATION_INFLUENCE, Vars.ALIGNMENT_INFLUENCE, Vars.COHESION_INFLUENCE);

         applyAccelerationFromGround(zombieHitbox, polarVec2(Vars.ACCELERATION_SLOW, zombieHitbox.box.angle));
         return;
      }
   }

   // Wander AI
   const wanderAI = aiHelperComponent.getWanderAI();
   wanderAI.update(zombie);
   if (wanderAI.targetPosition !== null) {
      moveEntityToPosition(zombie, wanderAI.targetPosition.x, wanderAI.targetPosition.y, wanderAI.acceleration, wanderAI.turnSpeed, wanderAI.turnDamping);
   }
}

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(entity);
   packet.writeNumber(zombieComponent.zombieType);
}

function onHitboxCollision(hitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const zombie = hitbox.entity;
   const collidingEntity = collidingHitbox.entity;
   
   // Pick up item entities
   if (getEntityType(collidingEntity) === EntityType.itemEntity) {
      pickupItemEntity(zombie, collidingEntity);
      return;
   }
   
   if (!zombieShouldAttackEntity(zombie, collidingEntity)) {
      return;
   }

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "zombie")) {
      return;
   }

   const hitDirection = hitbox.box.position.angleTo(collidingHitbox.box.position);

   // Damage and knock back the player
   damageEntity(collidingHitbox, zombie, 1, DamageSource.zombie, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingHitbox, polarVec2(150, hitDirection));
   addLocalInvulnerabilityHash(collidingEntity, "zombie", 0.3);

   // Push the zombie away from the entity
   const flinchDirection = hitDirection + Math.PI;
   applyAbsoluteKnockback(hitbox, polarVec2(100, flinchDirection));
}

function preRemove(zombie: Entity): void {
   const zombieComponent = ZombieComponentArray.getComponent(zombie);
   if (zombieComponent.tombstone !== 0 && TombstoneComponentArray.hasComponent(zombieComponent.tombstone)) {
      const tombstoneComponent = TombstoneComponentArray.getComponent(zombieComponent.tombstone);
      tombstoneComponent.numZombies--;
   }
}

function onTakeDamage(zombie: Entity, _hitHitbox: Hitbox, attackingEntity: Entity | null): void {
   if (attackingEntity !== null) {
      // @Cleanup: too many ifs. generalise
      const attackingEntityType = getEntityType(attackingEntity);
      if (HealthComponentArray.hasComponent(attackingEntity) && attackingEntityType !== EntityType.iceSpikes && attackingEntityType !== EntityType.cactus && attackingEntityType !== EntityType.floorSpikes && attackingEntityType !== EntityType.wallSpikes && attackingEntityType !== EntityType.floorPunjiSticks && attackingEntityType !== EntityType.wallPunjiSticks) {
         const zombieComponent = ZombieComponentArray.getComponent(zombie);
         zombieComponent.attackingEntityIDs[attackingEntity] = ZombieVars.CHASE_PURSUE_TIME_TICKS;
      }
   }
}