import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { distance, Point, randInt } from "battletribes-shared/utils";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { GolemComponent, GolemComponentArray } from "../../components/GolemComponent";
import { createItemsOverEntity } from "../../entity-shared";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ItemType } from "battletribes-shared/items/items";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../../components";
import { createHitbox, HitboxCollisionType, Hitbox } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getGameTicks } from "../../world";
import { StatusEffectComponent } from "../../components/StatusEffectComponent";
import { CollisionGroup } from "battletribes-shared/collision-groups";

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
      const otherBox = otherHitbox.box;

      const dist = distance(hitboxX, hitboxY, otherBox.offset.x, otherBox.offset.y);
      if (dist <= (otherBox as CircularBox).radius + 1) {
         return true;
      }
   }

   return false;
}

const getMinSeparationFromOtherHitboxes = (hitboxes: ReadonlyArray<Hitbox>, hitboxX: number, hitboxY: number, hitboxRadius: number): number => {
   let minSeparation = 999.9;
   for (let i = 0; i < hitboxes.length; i++) {
      const otherHitbox = hitboxes[i].box as CircularBox;

      const dist = distance(hitboxX, hitboxY, otherHitbox.offset.x, otherHitbox.offset.y);
      const separation = dist - otherHitbox.radius - hitboxRadius;
      if (separation < minSeparation) {
         minSeparation = separation;
      }
   }
   return minSeparation;
}

export function createGolemConfig(): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent(CollisionGroup.default);
   
   // Create core hitbox
   const hitbox = createHitbox(new CircularBox(new Point(0, 0), 0, 36), ROCK_MASSIVE_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
   transformComponent.addHitbox(hitbox, null);

   // Create head hitbox
   transformComponent.addHitbox(createHitbox(new CircularBox(new Point(0, 45), 0, 32), ROCK_LARGE_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []), null);
   
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
      if (hitboxIsTooClose(transformComponent.hitboxes, x, y)) {
         continue;
      }

      // Make sure the hitbox touches another one at least a small amount
      const minSeparation = getMinSeparationFromOtherHitboxes(transformComponent.hitboxes, x, y, radius);
      if (minSeparation > -6) {
         continue;
      }

      const mass = size === 0 ? ROCK_SMALL_MASS : ROCK_MEDIUM_MASS;
      const hitbox = createHitbox(new CircularBox(new Point(x, y), 0, radius), mass, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      transformComponent.addHitbox(hitbox, null);

      i++;
   }

   // Create hand hitboxes
   for (let j = 0; j < 2; j++) {
      const offsetX = 60 * (j === 0 ? -1 : 1);
      const hitbox = createHitbox(new CircularBox(new Point(offsetX, 50), 0, 20), ROCK_MEDIUM_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []);
      transformComponent.addHitbox(hitbox, null);

      // Wrist
      const inFactor = 0.75;
      transformComponent.addHitbox(createHitbox(new CircularBox(new Point(offsetX * inFactor, 50 * inFactor), 0, 12), ROCK_TINY_MASS, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []), null);
   }
   
   const physicsComponent = new PhysicsComponent();

   const healthComponent = new HealthComponent(150);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   const golemComponent = new GolemComponent(transformComponent.hitboxes, GolemVars.PEBBLUM_SUMMON_COOLDOWN_TICKS);
   
   return {
      entityType: EntityType.golem,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.health]: healthComponent,
         [ServerComponentType.statusEffect]: statusEffectComponent,
         [ServerComponentType.golem]: golemComponent
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
      golemComponent.lastWakeTicks = getGameTicks();
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