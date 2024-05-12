import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision-detection";
import { GolemComponentData } from "webgl-test-shared/dist/components";
import { EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { ItemType } from "webgl-test-shared/dist/items";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { distance, lerp, Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { GolemComponentArray, HealthComponentArray, PebblumComponentArray } from "../../components/ComponentArray";
import { HealthComponent, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { GolemComponent } from "../../components/GolemComponent";
import Board from "../../Board";
import { stopEntity } from "../../ai-shared";
import { createPebblum } from "./pebblum";
import { SERVER } from "../../server";
import { createItemsOverEntity } from "../../entity-shared";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";

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

      const dist = distance(hitboxX, hitboxY, golem.position.x + otherHitbox.offsetX, golem.position.y + otherHitbox.offsetY);
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

      const dist = distance(hitboxX, hitboxY, golem.position.x + otherHitbox.offsetX, golem.position.y + otherHitbox.offsetY);
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

      rockInfo.hitbox.offsetX = lerp(rockInfo.sleepOffsetX, rockInfo.awakeOffsetX, wakeProgress);
      rockInfo.hitbox.offsetY = lerp(rockInfo.sleepOffsetY, rockInfo.awakeOffsetY, wakeProgress);
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem.id);
   physicsComponent.hitboxesAreDirty = true;
}

export function createGolem(position: Point): Entity {
   const golem = new Entity(position, EntityType.golem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);
   golem.rotation = 2 * Math.PI * Math.random();

   // Create core hitbox
   const hitbox = new CircularHitbox(golem.position.x, golem.position.y, ROCK_MASSIVE_MASS, 0, 0, HitboxCollisionType.soft, 36, golem.getNextHitboxLocalID(), golem.rotation);
   golem.addHitbox(hitbox);

   // Create head hitbox
   golem.addHitbox(new CircularHitbox(golem.position.x, golem.position.y, ROCK_LARGE_MASS, 0, 45, HitboxCollisionType.soft, 32, golem.getNextHitboxLocalID(), golem.rotation));
   
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
      const hitbox = new CircularHitbox(golem.position.x, golem.position.y, mass, offsetX, offsetY, HitboxCollisionType.soft, radius, golem.getNextHitboxLocalID(), golem.rotation);
      golem.addHitbox(hitbox);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = new CircularHitbox(golem.position.x, golem.position.y, ROCK_MEDIUM_MASS, offsetX, 50, HitboxCollisionType.soft, 20, golem.getNextHitboxLocalID(), golem.rotation);
      golem.addHitbox(hitbox);

      // Wrist
      const inFactor = 0.75;
      golem.addHitbox(new CircularHitbox(golem.position.x, golem.position.y, ROCK_TINY_MASS, offsetX * inFactor, 50 * inFactor, HitboxCollisionType.soft, 12, golem.getNextHitboxLocalID(), golem.rotation));
   }

   PhysicsComponentArray.addComponent(golem.id, new PhysicsComponent(true, false));
   HealthComponentArray.addComponent(golem.id, new HealthComponent(150));
   StatusEffectComponentArray.addComponent(golem.id, new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned));
   const golemComponent = new GolemComponent(golem.hitboxes, PEBBLUM_SUMMON_COOLDOWN_TICKS);
   GolemComponentArray.addComponent(golem.id, golemComponent);

   // Set initial hitbox positions (sleeping)
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];
      rockInfo.hitbox.offsetX = rockInfo.sleepOffsetX;
      rockInfo.hitbox.offsetY = rockInfo.sleepOffsetY;
   }

   return golem;
}

const getTarget = (golemComponent: GolemComponent): Entity => {
   let mostDamage = 0;
   let mostDamagingEntity!: Entity;
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const targetID = Number(_targetID);

      const damageDealt = golemComponent.attackingEntities[targetID].damageDealtToSelf;
      if (damageDealt > mostDamage) {
         mostDamage = damageDealt;
         mostDamagingEntity = Board.entityRecord[targetID]!;
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
      rockInfo.hitbox.offsetX = lerp(rockInfo.lastOffsetX, rockInfo.targetOffsetX, shiftProgress);
      rockInfo.hitbox.offsetY = lerp(rockInfo.lastOffsetY, rockInfo.targetOffsetY, shiftProgress);
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
      
      const pebblum = createPebblum(new Point(x, y), target.id);
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

      if (!Board.entityRecord.hasOwnProperty(targetID)) {
         delete golemComponent.attackingEntities[targetID];
         continue;
      }

      golemComponent.attackingEntities[targetID].timeSinceLastAggro += Settings.I_TPS;
      if (golemComponent.attackingEntities[targetID].timeSinceLastAggro >= TARGET_ENTITY_FORGET_TIME) {
         delete golemComponent.attackingEntities[targetID];
      }
   }

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
      stopEntity(golem);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         const pebblum = Board.entityRecord[pebblumID];
         if (typeof pebblum !== "undefined") {
            pebblum.remove();
         }
      }
      return;
   }

   const target = getTarget(golemComponent);

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
      golem.turn(angleToTarget, Math.PI / 4);
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

   golem.turn(angleToTarget, Math.PI / 1.5);
   golem.acceleration.x = 350 * Math.sin(angleToTarget);
   golem.acceleration.y = 350 * Math.cos(angleToTarget);
}

// @Cleanup: Copy and paste from frozen-yeti
export function onGolemHurt(golem: Entity, attackingEntity: Entity, damage: number): void {
   if (!HealthComponentArray.hasComponent(attackingEntity.id)) {
      return;
   }
   
   const golemComponent = GolemComponentArray.getComponent(golem.id);

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

export function onGolemCollision(golem: Entity, collidingEntity: Entity): void {
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
   damageEntity(collidingEntity, 3, golem, PlayerCauseOfDeath.yeti, "golem");
   applyKnockback(collidingEntity, 300, hitDirection);
   SERVER.registerEntityHit({
      entityPositionX: collidingEntity.position.x,
      entityPositionY: collidingEntity.position.y,
      hitEntityID: collidingEntity.id,
      damage: 3,
      knockback: 300,
      angleFromAttacker: hitDirection,
      attackerID: golem.id,
      flags: 0
   });
   addLocalInvulnerabilityHash(healthComponent, "golem", 0.3);
}

export function onGolemDeath(golem: Entity): void {
   createItemsOverEntity(golem, ItemType.living_rock, randInt(10, 20), 60);
}


export function serialiseGolemComponent(golem: Entity): GolemComponentData {
   const golemComponent = GolemComponentArray.getComponent(golem.id);
   return {
      wakeProgress: golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS
   };
}