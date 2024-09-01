import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { distance, lerp, Point, randInt } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { GolemComponent, GolemComponentArray } from "../../components/GolemComponent";
import Board from "../../Board";
import { createItemsOverEntity } from "../../entity-shared";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, Hitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ItemType } from "webgl-test-shared/dist/items/items";
import { TransformComponentArray } from "../../components/TransformComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";

export const enum GolemVars {
   PEBBLUM_SUMMON_COOLDOWN_TICKS = 10 * Settings.TPS
}

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

export const GOLEM_WAKE_TIME_TICKS = Math.floor(2.5 * Settings.TPS);

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
         pebblumSummonCooldownTicks: GolemVars.PEBBLUM_SUMMON_COOLDOWN_TICKS
      }
   };
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