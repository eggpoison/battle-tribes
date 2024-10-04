import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { PebblumComponentArray } from "../../components/PebblumComponent";
import { applyKnockback } from "../../components/PhysicsComponent";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType, Hitbox } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.pebblum;

export function createPebblumConfig(): ComponentConfig<ComponentTypes> {
   const hitboxes = new Array<Hitbox>();

   // Body
   hitboxes.push(createHitbox(new CircularBox(new Point(0, -4), 0, 10 * 2), 0.4, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []));
   // Nose
   hitboxes.push(createHitbox(new CircularBox(new Point(0, 6), 0, 8 * 2), 0.3, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, []));
   
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
         traction: 1,
         isAffectedByAirFriction: true,
         isAffectedByGroundFriction: true,
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