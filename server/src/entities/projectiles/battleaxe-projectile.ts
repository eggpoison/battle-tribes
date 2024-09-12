import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import Board from "../../Board";
import { applyKnockback } from "../../components/PhysicsComponent";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponentArray } from "../../components/TransformComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import CircularBox from "battletribes-shared/boxes/CircularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.throwingProjectile
   | ServerComponentType.battleaxeProjectile;

export function createBattleaxeProjectileConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.battleaxeProjectile,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new CircularBox(new Point(0, 0), 0, 32), 0.6, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: true,
         isImmovable: true
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.throwingProjectile]: {
         tribeMember: 0,
         itemID: null
      },
      [ServerComponentType.battleaxeProjectile]: {}
   };
}

export function onBattleaxeProjectileCollision(battleaxe: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Don't hurt the entity who threw the spear
   const spearComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);
   if (collidingEntity === spearComponent.tribeMember) {
      return;
   }

   const relationship = getEntityRelationship(battleaxe, collidingEntity);
   if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.friendlyBuilding) {
      return;
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const healthComponent = HealthComponentArray.getComponent(collidingEntity);
      const attackHash = "battleaxe-" + battleaxe;
      if (!canDamageEntity(healthComponent, attackHash)) {
         return;
      }
      
      const tribeMember = Board.validateEntity(spearComponent.tribeMember);

      // Damage the entity
      const battleaxeTransformComponent = TransformComponentArray.getComponent(battleaxe);
      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);
      const direction = battleaxeTransformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);

      // @Incomplete cause of death
      damageEntity(collidingEntity, tribeMember, 4, PlayerCauseOfDeath.spear, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 150, direction);
      addLocalInvulnerabilityHash(HealthComponentArray.getComponent(collidingEntity), attackHash, 0.3);
   }
}