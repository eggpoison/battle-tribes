import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { SnowballSize, EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { Settings } from "battletribes-shared/settings";
import { StatusEffect } from "battletribes-shared/status-effects";
import { Point, randFloat } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../components/HealthComponent";
import { SnowballComponentArray } from "../components/SnowballComponent";
import { PhysicsComponentArray, applyKnockback } from "../components/PhysicsComponent";
import { ComponentConfig } from "../components";
import { ServerComponentType } from "battletribes-shared/components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { getAgeTicks, TransformComponentArray } from "../components/TransformComponent";
import Layer from "../Layer";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";
import { getEntityType } from "../world";
   
type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.health
   | ServerComponentType.statusEffect
   | ServerComponentType.snowball;

const DAMAGE_VELOCITY_THRESHOLD = 100;

export function createSnowballConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.snowball,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: false
      },
      [ServerComponentType.health]: {
         maxHealth: 0
      },
      [ServerComponentType.statusEffect]: {
         statusEffectImmunityBitset: StatusEffect.poisoned | StatusEffect.freezing
      },
      [ServerComponentType.snowball]: {
         yetiID: 0,
         size: SnowballSize.small,
         lifetime: Math.floor(randFloat(10, 15) * Settings.TPS)
      }
   };
}

export function onSnowballCollision(snowball: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = getEntityType(collidingEntity);
   if (collidingEntityType === EntityType.snowball) {
      return;
   }

   // Don't let the snowball damage the yeti which threw it
   if (collidingEntityType === EntityType.yeti) {
      const snowballComponent = SnowballComponentArray.getComponent(snowball);
      if (collidingEntity === snowballComponent.yetiID) {
         return;
      }
   }
   
   const transformComponent = TransformComponentArray.getComponent(snowball);
   const physicsComponent = PhysicsComponentArray.getComponent(snowball);

   const vx = physicsComponent.selfVelocity.x + physicsComponent.externalVelocity.x;
   const vy = physicsComponent.selfVelocity.y + physicsComponent.externalVelocity.y;
   const velocity = Math.sqrt(vx * vx + vy * vy);

   const ageTicks = getAgeTicks(transformComponent);
   if (velocity < DAMAGE_VELOCITY_THRESHOLD || ageTicks >= 2 * Settings.TPS) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      if (canDamageEntity(healthComponent, "snowball")) {
         const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
         
         const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

         damageEntity(collidingEntity, null, 4, PlayerCauseOfDeath.snowball, AttackEffectiveness.effective, collisionPoint, 0);
         applyKnockback(collidingEntity, 100, hitDirection);
         addLocalInvulnerabilityHash(healthComponent, "snowball", 0.3);
      }
   }
}