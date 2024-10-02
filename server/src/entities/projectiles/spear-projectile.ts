import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, entityExists } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.throwingProjectile
   | ServerComponentType.spearProjectile;

export function createSpearProjectileConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.spearProjectile,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), 12, 60, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
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
      [ServerComponentType.throwingProjectile]: {
         tribeMember: 0,
         itemID: null
      },
      [ServerComponentType.spearProjectile]: {}
   };
}

export function onSpearProjectileCollision(spear: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Don't hurt friendlies
   const spearComponent = ThrowingProjectileComponentArray.getComponent(spear);
   if (entityExists(spearComponent.tribeMember) && getEntityRelationship(spearComponent.tribeMember, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const tribeMember = entityExists(spearComponent.tribeMember) ? spearComponent.tribeMember : null;

   const spearPhysicsComponent = PhysicsComponentArray.getComponent(spear);

   let vx = spearPhysicsComponent.selfVelocity.x + spearPhysicsComponent.externalVelocity.x;
   let vy = spearPhysicsComponent.selfVelocity.y + spearPhysicsComponent.externalVelocity.y;
   if (tribeMember !== null) {
      const tribeMemberPhysicsComponent = PhysicsComponentArray.getComponent(tribeMember);
      vx -= tribeMemberPhysicsComponent.selfVelocity.x + tribeMemberPhysicsComponent.externalVelocity.x;
      vy -= tribeMemberPhysicsComponent.selfVelocity.y + tribeMemberPhysicsComponent.externalVelocity.y;
   }
   
   const spearVelocityMagnitude = Math.sqrt(vx * vx + vy * vy);
   const damage = Math.floor(spearVelocityMagnitude / 140);
   
   const spearTransformComponent = TransformComponentArray.getComponent(spear);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
   // Damage the entity
   // @Temporary
   const hitDirection = spearTransformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
   damageEntity(collidingEntity, tribeMember, damage, PlayerCauseOfDeath.spear, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 200, hitDirection);
   
   destroyEntity(spear);
}