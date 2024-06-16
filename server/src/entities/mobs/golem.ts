import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { distance, lerp, Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { GolemComponent, GolemComponentArray } from "../../components/GolemComponent";
import Board from "../../Board";
import { stopEntity } from "../../ai-shared";
import { createPebblum } from "./pebblum";
import { createItemsOverEntity } from "../../entity-shared";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { PebblumComponentArray } from "../../components/PebblumComponent";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

export const BODY_GENERATION_RADIUS = 55;

const ROCK_TINY_MASS = 0.5;
const ROCK_SMALL_MASS = 0.75;
const ROCK_MEDIUM_MASS = 1.15;
const ROCK_LARGE_MASS = 1.75;
const ROCK_MASSIVE_MASS = 2.25;

const TARGET_ENTITY_FORGET_TIME = 20;

export const GOLEM_WAKE_TIME_TICKS = Math.floor(2.5 * Settings.TPS);

const PEBBLUM_SUMMON_COOLDOWN_TICKS = 10 * Settings.TPS;

const ROCK_SHIFT_INTERVAL = Math.floor(0.225 * Settings.TPS);

const hitboxIsTooClose = (golem: Entity, hitboxX: number, hitboxY: number): boolean => {
   for (let j = 0; j < golem.hitboxes.length; j++) {
      const otherHitbox = golem.hitboxes[j];

      const dist = distance(hitboxX, hitboxY, golem.position.x + otherHitbox.offset.x, golem.position.y + otherHitbox.offset.y);
      if (dist <= (otherHitbox as CircularHitbox).radius + 1) {
         return true;
      }
   }

   return false;
}

const getMinSeparationFromOtherHitboxes = (golem: Entity, hitboxX: number, hitboxY: number, hitboxRadius: number): number => {
   let minSeparation = 999.9;
   for (let i = 0; i < golem.hitboxes.length; i++) {
      const otherHitbox = golem.hitboxes[i] as CircularHitbox;

      const dist = distance(hitboxX, hitboxY, golem.position.x + otherHitbox.offset.x, golem.position.y + otherHitbox.offset.y);
      const separation = dist - otherHitbox.radius - hitboxRadius;
      if (separation < minSeparation) {
         minSeparation = separation;
      }
   }
   return minSeparation;
}

const updateGolemHitboxPositions = (golem: Entity, golemComponent: GolemComponent, wakeProgress: number): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.hitbox.offset.x = lerp(rockInfo.sleepOffsetX, rockInfo.awakeOffsetX, wakeProgress);
      rockInfo.hitbox.offset.y = lerp(rockInfo.sleepOffsetY, rockInfo.awakeOffsetY, wakeProgress);
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem.id);
   physicsComponent.hitboxesAreDirty = true;
}

export function createGolem(position: Point): Entity {
   const golem = new Entity(position, 2 * Math.PI * Math.random(), EntityType.golem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   // Create core hitbox
   const hitbox = new CircularHitbox(ROCK_MASSIVE_MASS, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, golem.getNextHitboxLocalID(), 0, 36);
   golem.addHitbox(hitbox);

   // Create head hitbox
   golem.addHitbox(new CircularHitbox(ROCK_LARGE_MASS, new Point(0, 45), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, golem.getNextHitboxLocalID(), 0, 32));
   
   // Create body hitboxes
   let i = 0;
   let attempts = 0;
   while (i < 8 && ++attempts < 100) {
      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const offsetX = offsetMagnitude * Math.sin(offsetDirection);
      const offsetY = offsetMagnitude * Math.cos(offsetDirection);
      const x = golem.position.x + offsetX;
      const y = golem.position.y + offsetY;

      const size = Math.random() < 0.4 ? 0 : 1;
      const radius = size === 0 ? 20 : 26;

      // Make sure the hitboxes aren't too close
      if (hitboxIsTooClose(golem, x, y)) {
         continue;
      }

      // Make sure the hitbox touches another one at least a small amount
      const minSeparation = getMinSeparationFromOtherHitboxes(golem, x, y, radius);
      if (minSeparation > -6) {
         continue;
      }

      const mass = size === 0 ? ROCK_SMALL_MASS : ROCK_MEDIUM_MASS;
      const hitbox = new CircularHitbox(mass, new Point(offsetX, offsetY), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, golem.getNextHitboxLocalID(), 0, radius);
      golem.addHitbox(hitbox);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = new CircularHitbox(ROCK_MEDIUM_MASS, new Point(offsetX, 50), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, golem.getNextHitboxLocalID(), 0, 20);
      golem.addHitbox(hitbox);

      // Wrist
      const inFactor = 0.75;
      golem.addHitbox(new CircularHitbox(ROCK_TINY_MASS, new Point(offsetX * inFactor, 50 * inFactor), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, golem.getNextHitboxLocalID(), 0, 12));
   }

   PhysicsComponentArray.addComponent(golem.id, new PhysicsComponent(0, 0, 0, 0, true, false));
   HealthComponentArray.addComponent(golem.id, new HealthComponent(150));
   StatusEffectComponentArray.addComponent(golem.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned));
   const golemComponent = new GolemComponent(golem.hitboxes, PEBBLUM_SUMMON_COOLDOWN_TICKS);
   GolemComponentArray.addComponent(golem.id, golemComponent);

   // Set initial hitbox positions (sleeping)
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];
      rockInfo.hitbox.offset.x = rockInfo.sleepOffsetX;
      rockInfo.hitbox.offset.y = rockInfo.sleepOffsetY;
   }

   return golem;
}

const getTarget = (golemComponent: GolemComponent): Entity => {
   let mostDamage = 0;
   let mostDamagingEntity!: Entity;
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const targetID = Number(_targetID);

      // @Hack: shouldn't be undefined.
      const target = Board.entityRecord[targetID];
      if (typeof target === "undefined") {
         continue;
      }

      const damageDealt = golemComponent.attackingEntities[targetID].damageDealtToSelf;
      if (damageDealt > mostDamage) {
         mostDamage = damageDealt;
         mostDamagingEntity = target;
      }
   }
   return mostDamagingEntity;
}

const shiftRocks = (golem: Entity, golemComponent: GolemComponent): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.currentShiftTimerTicks++;
      if (rockInfo.currentShiftTimerTicks >= ROCK_SHIFT_INTERVAL) {
         rockInfo.lastOffsetX = rockInfo.targetOffsetX;
         rockInfo.lastOffsetY = rockInfo.targetOffsetY;
         const offsetMagnitude = randFloat(0, 3);
         const offsetDirection = 2 * Math.PI * Math.random();
         rockInfo.targetOffsetX = rockInfo.awakeOffsetX + offsetMagnitude * Math.sin(offsetDirection);
         rockInfo.targetOffsetY = rockInfo.awakeOffsetY + offsetMagnitude * Math.cos(offsetDirection);
         rockInfo.currentShiftTimerTicks = 0;
      }

      const shiftProgress = rockInfo.currentShiftTimerTicks / ROCK_SHIFT_INTERVAL;
      rockInfo.hitbox.offset.x = lerp(rockInfo.lastOffsetX, rockInfo.targetOffsetX, shiftProgress);
      rockInfo.hitbox.offset.y = lerp(rockInfo.lastOffsetY, rockInfo.targetOffsetY, shiftProgress);
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem.id);
   physicsComponent.hitboxesAreDirty = true;
}

const summonPebblums = (golem: Entity, golemComponent: GolemComponent, target: Entity): void => {
   const numPebblums = randInt(2, 3);
   for (let i = 0; i < numPebblums; i++) {
      const offsetMagnitude = randFloat(200, 350);
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = golem.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = golem.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const pebblum = createPebblum(new Point(x, y), 2 * Math.PI * Math.random(), target.id);
      golemComponent.summonedPebblumIDs.push(pebblum.id);
   }
}

export function tickGolem(golem: Entity): void {
   const golemComponent = GolemComponentArray.getComponent(golem.id);
   
   // Remove targets which are dead or have been out of aggro long enough
   // @Speed: Remove calls to Object.keys, Number, and hasOwnProperty
   // @Cleanup: Copy and paste from frozen-yeti
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const targetID = Number(_targetID);

      const target = golemComponent.attackingEntities[targetID];
      if (typeof target === "undefined" || target.timeSinceLastAggro >= TARGET_ENTITY_FORGET_TIME) {
         delete golemComponent.attackingEntities[targetID];
      } else {
         target.timeSinceLastAggro += Settings.I_TPS;
      }
   }

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
      const physicsComponent = PhysicsComponentArray.getComponent(golem.id);
      stopEntity(physicsComponent);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         const pebblum = Board.entityRecord[pebblumID];
         if (typeof pebblum !== "undefined") {
            pebblum.destroy();
         }
      }
      return;
   }

   const target = getTarget(golemComponent);

   // @Hack @Copynpaste: remove once the above guard works
   if (typeof target === "undefined") {
      const physicsComponent = PhysicsComponentArray.getComponent(golem.id);
      stopEntity(physicsComponent);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         const pebblum = Board.entityRecord[pebblumID];
         if (typeof pebblum !== "undefined") {
            pebblum.destroy();
         }
      }
      return;
   }

   // Update summoned pebblums
   for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
      const pebblumID = golemComponent.summonedPebblumIDs[i];
      if (!Board.entityRecord.hasOwnProperty(pebblumID)) {
         golemComponent.summonedPebblumIDs.splice(i, 1);
         i--;
         continue;
      }

      const pebblumComponent = PebblumComponentArray.getComponent(pebblumID);
      pebblumComponent.targetEntityID = target.id;
   }

   const angleToTarget = golem.position.calculateAngleBetween(target.position);

   // Wake up
   if (golemComponent.wakeTimerTicks < GOLEM_WAKE_TIME_TICKS) {
      const wakeProgress = golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS;
      updateGolemHitboxPositions(golem, golemComponent, wakeProgress);
      
      golemComponent.wakeTimerTicks++;

      const physicsComponent = PhysicsComponentArray.getComponent(golem.id);
      physicsComponent.targetRotation = angleToTarget;
      physicsComponent.turnSpeed = Math.PI / 4;
      return;
   }

   shiftRocks(golem, golemComponent);

   if (golemComponent.summonedPebblumIDs.length === 0) {
      if (golemComponent.pebblumSummonCooldownTicks > 0) {
         golemComponent.pebblumSummonCooldownTicks--;
      } else {
         summonPebblums(golem, golemComponent, target);
         golemComponent.pebblumSummonCooldownTicks = PEBBLUM_SUMMON_COOLDOWN_TICKS;
      }
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem.id);

   physicsComponent.acceleration.x = 350 * Math.sin(angleToTarget);
   physicsComponent.acceleration.y = 350 * Math.cos(angleToTarget);

   physicsComponent.targetRotation = angleToTarget;
   physicsComponent.turnSpeed = Math.PI / 1.5;
}

// @Cleanup: Copy and paste from frozen-yeti
export function onGolemHurt(golem: Entity, attackingEntity: Entity, damage: number): void {
   if (!HealthComponentArray.hasComponent(attackingEntity.id)) {
      return;
   }
   
   const golemComponent = GolemComponentArray.getComponent(golem.id);

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
      golemComponent.lastWakeTicks = Board.ticks;
   }
   
   // Update/create the entity's targetInfo record
   if (golemComponent.attackingEntities.hasOwnProperty(attackingEntity.id)) {
      golemComponent.attackingEntities[attackingEntity.id].damageDealtToSelf += damage;
      golemComponent.attackingEntities[attackingEntity.id].timeSinceLastAggro = 0;
   } else {
      golemComponent.attackingEntities[attackingEntity.id] = {
         damageDealtToSelf: damage,
         timeSinceLastAggro: 0
      };
   }
}

export function onGolemCollision(golem: Entity, collidingEntity: Entity, collisionPoint: Point): void {
   if (!HealthComponentArray.hasComponent(collidingEntity.id)) {
      return;
   }
   
   // Don't hurt entities which aren't attacking the golem
   const golemComponent = GolemComponentArray.getComponent(golem.id);
   if (!golemComponent.attackingEntities.hasOwnProperty(collidingEntity.id)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity.id);
   if (!canDamageEntity(healthComponent, "golem")) {
      return;
   }
   
   const hitDirection = golem.position.calculateAngleBetween(collidingEntity.position);

   // @Incomplete: Cause of death
   damageEntity(collidingEntity, golem, 3, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 300, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "golem", 0.3);
}

export function onGolemDeath(golem: Entity): void {
   createItemsOverEntity(golem, ItemType.living_rock, randInt(10, 20), 60);
}