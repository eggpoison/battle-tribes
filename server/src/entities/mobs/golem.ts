import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { distance, lerp, Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { createEntityFromConfig } from "../../Entity";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { GolemComponent, GolemComponentArray } from "../../components/GolemComponent";
import Board from "../../Board";
import { stopEntity } from "../../ai-shared";
import { createPebblumConfig } from "./pebblum";
import { createItemsOverEntity } from "../../entity-shared";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { PebblumComponentArray } from "../../components/PebblumComponent";
import { CircularHitbox, Hitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../../components/TransformComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.golem;

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

const hitboxIsTooClose = (existingHitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number): boolean => {
   for (let j = 0; j < existingHitboxes.length; j++) {
      const otherHitbox = existingHitboxes[j];

      const dist = distance(hitboxX, hitboxY, otherHitbox.offset.x, otherHitbox.offset.y);
      if (dist <= (otherHitbox as CircularHitbox).radius + 1) {
         return true;
      }
   }

   return false;
}

const getMinSeparationFromOtherHitboxes = (hitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number, hitboxRadius: number): number => {
   let minSeparation = 999.9;
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i] as CircularHitbox;

      const dist = distance(hitboxX, hitboxY, otherHitbox.offset.x, otherHitbox.offset.y);
      const separation = dist - otherHitbox.radius - hitboxRadius;
      if (separation < minSeparation) {
         minSeparation = separation;
      }
   }
   return minSeparation;
}

const updateGolemHitboxPositions = (golem: EntityID, golemComponent: GolemComponent, wakeProgress: number): void => {
   for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
      const rockInfo = golemComponent.rockInfoArray[i];

      rockInfo.hitbox.offset.x = lerp(rockInfo.sleepOffsetX, rockInfo.awakeOffsetX, wakeProgress);
      rockInfo.hitbox.offset.y = lerp(rockInfo.sleepOffsetY, rockInfo.awakeOffsetY, wakeProgress);
   }

   const physicsComponent = PhysicsComponentArray.getComponent(golem);
   physicsComponent.hitboxesAreDirty = true;
}

export function createGolemConfig(): ComponentConfig<ComponentTypes> {
   const hitboxes = new Array<Hitbox>();

   // Create core hitbox
   const hitbox = new CircularHitbox(ROCK_MASSIVE_MASS, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 36);
   hitboxes.push(hitbox);

   // Create head hitbox
   hitboxes.push(new CircularHitbox(ROCK_LARGE_MASS, new Point(0, 45), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 32));
   
   // Create body hitboxes
   let i = 0;
   let attempts = 0;
   while (i < 8 && ++attempts < 100) {
      const offsetMagnitude = BODY_GENERATION_RADIUS * Math.random();
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = offsetMagnitude * Math.sin(offsetDirection);
      const y = offsetMagnitude * Math.cos(offsetDirection);

      const size = Math.random() < 0.4 ? 0 : 1;
      const radius = size === 0 ? 20 : 26;

      // Make sure the hitboxes aren't too close
      if (hitboxIsTooClose(hitboxes, x, y)) {
         continue;
      }

      // Make sure the hitbox touches another one at least a small amount
      const minSeparation = getMinSeparationFromOtherHitboxes(hitboxes, x, y, radius);
      if (minSeparation > -6) {
         continue;
      }

      const mass = size === 0 ? ROCK_SMALL_MASS : ROCK_MEDIUM_MASS;
      const hitbox = new CircularHitbox(mass, new Point(x, y), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, radius);
      hitboxes.push(hitbox);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = new CircularHitbox(ROCK_MEDIUM_MASS, new Point(offsetX, 50), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 20);
      hitboxes.push(hitbox);

      // Wrist
      const inFactor = 0.75;
      hitboxes.push(new CircularHitbox(ROCK_TINY_MASS, new Point(offsetX * inFactor, 50 * inFactor), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 12));
   }
   
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.golem,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: hitboxes
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 150
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned
      },
      [ServerComponentType.golem]: {
         hitboxes: hitboxes,
         pebblumSummonCooldownTicks: PEBBLUM_SUMMON_COOLDOWN_TICKS
      }
   };
}

// @Incomplete?
// // Set initial hitbox positions (sleeping)
// for (let i = 0; i < golemComponent.rockInfoArray.length; i++) {
//    const rockInfo = golemComponent.rockInfoArray[i];
//    rockInfo.hitbox.offset.x = rockInfo.sleepOffsetX;
//    rockInfo.hitbox.offset.y = rockInfo.sleepOffsetY;
// }

const getTarget = (golemComponent: GolemComponent): EntityID => {
   let mostDamage = 0;
   let mostDamagingEntity!: EntityID;
   for (const _targetID of Object.keys(golemComponent.attackingEntities)) {
      const target = Number(_targetID);

      if (!Board.hasEntity(target)) {
         continue;
      }

      const damageDealt = golemComponent.attackingEntities[target].damageDealtToSelf;
      if (damageDealt > mostDamage) {
         mostDamage = damageDealt;
         mostDamagingEntity = target;
      }
   }
   return mostDamagingEntity;
}

const shiftRocks = (golem: EntityID, golemComponent: GolemComponent): void => {
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

   const physicsComponent = PhysicsComponentArray.getComponent(golem);
   physicsComponent.hitboxesAreDirty = true;
}

const summonPebblums = (golem: EntityID, golemComponent: GolemComponent, target: EntityID): void => {
   const transformComponent = TransformComponentArray.getComponent(golem);
   
   const numPebblums = randInt(2, 3);
   for (let i = 0; i < numPebblums; i++) {
      const offsetMagnitude = randFloat(200, 350);
      const offsetDirection = 2 * Math.PI * Math.random();
      const x = transformComponent.position.x + offsetMagnitude * Math.sin(offsetDirection);
      const y = transformComponent.position.y + offsetMagnitude * Math.cos(offsetDirection);
      
      const config = createPebblumConfig();
      config[ServerComponentType.transform].position.x = x;
      config[ServerComponentType.transform].position.y = y;
      config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
      config[ServerComponentType.pebblum].targetEntityID = target;
      const pebblum = createEntityFromConfig(config);
      
      golemComponent.summonedPebblumIDs.push(pebblum);
   }
}

export function tickGolem(golem: EntityID): void {
   const golemComponent = GolemComponentArray.getComponent(golem);
   
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
      const physicsComponent = PhysicsComponentArray.getComponent(golem);
      stopEntity(physicsComponent);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         if (Board.hasEntity(pebblumID)) {
            Board.destroyEntity(pebblumID);
         }
      }
      return;
   }

   const target = getTarget(golemComponent);

   // @Hack @Copynpaste: remove once the above guard works
   if (typeof target === "undefined") {
      const physicsComponent = PhysicsComponentArray.getComponent(golem);
      stopEntity(physicsComponent);

      // Remove summoned pebblums
      for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
         const pebblumID = golemComponent.summonedPebblumIDs[i];

         if (Board.hasEntity(pebblumID)) {
            Board.destroyEntity(pebblumID);
         }
      }
      return;
   }

   // Update summoned pebblums
   for (let i = 0; i < golemComponent.summonedPebblumIDs.length; i++) {
      const pebblumID = golemComponent.summonedPebblumIDs[i];
      if (!Board.hasEntity(pebblumID)) {
         golemComponent.summonedPebblumIDs.splice(i, 1);
         i--;
         continue;
      }

      const pebblumComponent = PebblumComponentArray.getComponent(pebblumID);
      pebblumComponent.targetEntityID = target;
   }

   const transformComponent = TransformComponentArray.getComponent(golem);
   const targetTransformComponent = TransformComponentArray.getComponent(target);

   const angleToTarget = transformComponent.position.calculateAngleBetween(targetTransformComponent.position);

   // Wake up
   if (golemComponent.wakeTimerTicks < GOLEM_WAKE_TIME_TICKS) {
      const wakeProgress = golemComponent.wakeTimerTicks / GOLEM_WAKE_TIME_TICKS;
      updateGolemHitboxPositions(golem, golemComponent, wakeProgress);
      
      golemComponent.wakeTimerTicks++;

      const physicsComponent = PhysicsComponentArray.getComponent(golem);
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

   const physicsComponent = PhysicsComponentArray.getComponent(golem);

   physicsComponent.acceleration.x = 350 * Math.sin(angleToTarget);
   physicsComponent.acceleration.y = 350 * Math.cos(angleToTarget);

   physicsComponent.targetRotation = angleToTarget;
   physicsComponent.turnSpeed = Math.PI / 1.5;
}

// @Cleanup: Copy and paste from frozen-yeti
export function onGolemHurt(golem: EntityID, attackingEntity: EntityID, damage: number): void {
   if (!HealthComponentArray.hasComponent(attackingEntity)) {
      return;
   }
   
   const golemComponent = GolemComponentArray.getComponent(golem);

   if (Object.keys(golemComponent.attackingEntities).length === 0) {
      golemComponent.lastWakeTicks = Board.ticks;
   }
   
   // Update/create the entity's targetInfo record
   if (golemComponent.attackingEntities.hasOwnProperty(attackingEntity)) {
      golemComponent.attackingEntities[attackingEntity].damageDealtToSelf += damage;
      golemComponent.attackingEntities[attackingEntity].timeSinceLastAggro = 0;
   } else {
      golemComponent.attackingEntities[attackingEntity] = {
         damageDealtToSelf: damage,
         timeSinceLastAggro: 0
      };
   }
}

export function onGolemCollision(golem: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }
   
   // Don't hurt entities which aren't attacking the golem
   const golemComponent = GolemComponentArray.getComponent(golem);
   if (!golemComponent.attackingEntities.hasOwnProperty(collidingEntity)) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "golem")) {
      return;
   }
   
   const transformComponent = TransformComponentArray.getComponent(golem);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   // @Incomplete: Cause of death
   damageEntity(collidingEntity, golem, 3, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 300, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "golem", 0.3);
}

export function onGolemDeath(golem: EntityID): void {
   createItemsOverEntity(golem, ItemType.living_rock, randInt(10, 20), 60);
}