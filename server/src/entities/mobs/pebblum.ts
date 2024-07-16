import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { PebblumComponentArray } from "../../components/PebblumComponent";
import { moveEntityToPosition, stopEntity } from "../../ai-shared";
import Board from "../../Board";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, Hitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.pebblum;

const TURN_SPEED = Math.PI * 2;

export function createPebblumConfig(): ComponentConfig<ComponentTypes> {
   const hitboxes = new Array<Hitbox>();

   // Body
   hitboxes.push(new CircularHitbox(0.4, new Point(0, -4), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 10 * 2));
   // Nose
   hitboxes.push(new CircularHitbox(0.3, new Point(0, 6), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 8 * 2));
   
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.pebblum,
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
         maxHealth: 20
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned
      },
      [ServerComponentType.pebblum]: {
         // @Incomplete?
         targetEntityID: 0
      }
   };
}

export function tickPebblum(pebblum: EntityID): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum);

   const target = pebblumComponent.targetEntityID;
   if (Board.hasEntity(target)) {
      const targetTransformComponent = TransformComponentArray.getComponent(target);

      moveEntityToPosition(pebblum, targetTransformComponent.position.x, targetTransformComponent.position.y, 850, TURN_SPEED);
   } else {
      const physicsComponent = PhysicsComponentArray.getComponent(pebblum);
      stopEntity(physicsComponent);
   }
}

export function onPebblumCollision(pebblum: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const pebblumComponent = PebblumComponentArray.getComponent(pebblum);
   if (collidingEntity !== pebblumComponent.targetEntityID) {
      return;
   }
   
   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   if (!canDamageEntity(healthComponent, "pebblum")) {
      return;
   }

   const transformComponent = TransformComponentArray.getComponent(pebblum);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
   const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

   // @Incomplete: Cause of death
   damageEntity(collidingEntity, pebblum, 1, PlayerCauseOfDeath.yeti, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 100, hitDirection);
   addLocalInvulnerabilityHash(healthComponent, "pebblum", 0.3);
}