import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { SnowballSize, EntityType, SNOWBALL_SIZES, PlayerCauseOfDeath, EntityID } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point, randFloat, randSign } from "webgl-test-shared/dist/utils";
import Entity from "../Entity";
import { HealthComponent, HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../components/StatusEffectComponent";
import { SnowballComponent, SnowballComponentArray } from "../components/SnowballComponent";
import { PhysicsComponent, PhysicsComponentArray, applyKnockback } from "../components/PhysicsComponent";
import { ComponentConfig, EntityCreationInfo } from "../components";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "../components/TransformComponent";
import Board from "../Board";
   
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
         type: EntityType.slime,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 0)]
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

export function tickSnowball(snowball: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(snowball);
   const snowballComponent = SnowballComponentArray.getComponent(snowball);
   
   // @Incomplete. we use physics component angular velocity now, but that doesn't decrease over time!
   // Angular velocity
   // if (snowballComponent.angularVelocity !== 0) {
   //    snowball.rotation += snowballComponent.angularVelocity / Settings.TPS;

   //    const physicsComponent = PhysicsComponentArray.getComponent(snowball.id);
   //    physicsComponent.hitboxesAreDirty = true;
      
   //    const beforeSign = Math.sign(snowballComponent.angularVelocity);
   //    snowballComponent.angularVelocity -= Math.PI / Settings.TPS * beforeSign;
   //    if (beforeSign !== Math.sign(snowballComponent.angularVelocity)) {
   //       snowballComponent.angularVelocity = 0;
   //    }
   // }

   if (transformComponent.ageTicks >= snowballComponent.lifetimeTicks) {
      Board.destroyEntity(snowball);
   }
}

export function onSnowballCollision(snowball: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   const collidingEntityType = Board.getEntityType(collidingEntity);
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
   if (physicsComponent.velocity.length() < DAMAGE_VELOCITY_THRESHOLD || transformComponent.ageTicks >= 2 * Settings.TPS) {
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