import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import Board from "../../Board";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "../../components/TransformComponent";

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
         hitboxes: [new RectangularHitbox(0.5, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 12, 60, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
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
   if (Board.hasEntity(spearComponent.tribeMember) && getEntityRelationship(spearComponent.tribeMember, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   const tribeMember = Board.hasEntity(spearComponent.tribeMember) ? spearComponent.tribeMember : null;

   const physicsComponent = PhysicsComponentArray.getComponent(spear);
   const damage = Math.floor(physicsComponent.velocity.length() / 140);
   
   const spearTransformComponent = TransformComponentArray.getComponent(spear);
   const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
   
   // Damage the entity
   // @Temporary
   const hitDirection = spearTransformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
   damageEntity(collidingEntity, tribeMember, damage, PlayerCauseOfDeath.spear, AttackEffectiveness.effective, collisionPoint, 0);
   applyKnockback(collidingEntity, 200, hitDirection);
   
   Board.destroyEntity(spear);
}