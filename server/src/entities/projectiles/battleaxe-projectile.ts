import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityID, EntityType, PlayerCauseOfDeath } from "webgl-test-shared/dist/entities";
import { Settings } from "webgl-test-shared/dist/settings";
import { Point, lerp } from "webgl-test-shared/dist/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { ThrowingProjectileComponentArray } from "../../components/ThrowingProjectileComponent";
import Board from "../../Board";
import { PhysicsComponentArray, applyKnockback } from "../../components/PhysicsComponent";
import { CollisionVars, entitiesAreColliding } from "../../collision";
import { EntityRelationship, getEntityRelationship } from "../../components/TribeComponent";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../../components";
import { AttackEffectiveness } from "webgl-test-shared/dist/entity-damage-types";
import { CircularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { TransformComponentArray } from "../../components/TransformComponent";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.throwingProjectile;

const RETURN_TIME_TICKS = 1 * Settings.TPS;

export function createBattleaxeProjectileConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.battleaxeProjectile,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [new CircularHitbox(0.6, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 32)]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         isAffectedByFriction: true,
         isImmovable: true
      },
      [ServerComponentType.tribe]: {
         tribeID: null
      },
      [ServerComponentType.throwingProjectile]: {
         tribeMemberID: 0,
         itemID: null
      }
   };
}

export function tickBattleaxeProjectile(battleaxe: EntityID): void {
   const transformComponent = TransformComponentArray.getComponent(battleaxe);
   const physicsComponent = PhysicsComponentArray.getComponent(battleaxe);

   if (transformComponent.ageTicks < RETURN_TIME_TICKS) {
      physicsComponent.angularVelocity = -6 * Math.PI;
   } else {
      physicsComponent.angularVelocity = 0;
      
      const throwingProjectileComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);

      if (!Board.hasEntity(throwingProjectileComponent.tribeMemberID)) {
         Board.destroyEntity(battleaxe);
         return;
      }
      
      if (entitiesAreColliding(battleaxe, throwingProjectileComponent.tribeMemberID) !== CollisionVars.NO_COLLISION) {
         Board.destroyEntity(battleaxe);
         return;
      }

      const ownerTransformComponent = TransformComponentArray.getComponent(throwingProjectileComponent.tribeMemberID);
      
      const ticksSinceReturn = transformComponent.ageTicks - RETURN_TIME_TICKS;
      transformComponent.rotation -= lerp(6 * Math.PI / Settings.TPS, 0, Math.min(ticksSinceReturn / Settings.TPS * 1.25, 1));

      // @Hack: Just set velocity instead of adding to position
      const returnDirection = transformComponent.position.calculateAngleBetween(ownerTransformComponent.position);
      const returnSpeed = lerp(0, 800, Math.min(ticksSinceReturn / Settings.TPS * 1.5, 1));
      transformComponent.position.x += returnSpeed * Settings.I_TPS * Math.sin(returnDirection);
      transformComponent.position.y += returnSpeed * Settings.I_TPS * Math.cos(returnDirection);
      physicsComponent.positionIsDirty = true;

      // Turn to face the owner
      physicsComponent.targetRotation = ownerTransformComponent.rotation;
      physicsComponent.turnSpeed = ticksSinceReturn / Settings.TPS * Math.PI;
   }
}

export function onBattleaxeProjectileCollision(battleaxe: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Don't hurt the entity who threw the spear
   const spearComponent = ThrowingProjectileComponentArray.getComponent(battleaxe);
   if (collidingEntity === spearComponent.tribeMemberID) {
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
      
      const tribeMember = Board.validateEntity(spearComponent.tribeMemberID);

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