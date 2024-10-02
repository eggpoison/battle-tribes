import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import {ServerComponentType } from "battletribes-shared/components";
import { EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import Layer from "../../Layer";
import { applyKnockback } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { ComponentConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponentArray } from "../../components/TransformComponent";
import { ProjectileComponentArray } from "../../components/ProjectileComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, getEntityType, validateEntity } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.projectile;

export function createSlingTurretRockConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.slingTurretRock,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), 12, 64, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, [])]
      },
      [ServerComponentType.physics]: {
         velocityX: 0,
         velocityY: 0,
         accelerationX: 0,
         accelerationY: 0,
         traction: 1,
         isAffectedByFriction: false,
         isImmovable: true
      },
      [ServerComponentType.tribe]: {
         tribe: null,
         tribeType: 0
      },
      [ServerComponentType.projectile]: {
         owner: 0
      }
   };
}

// @Cleanup: Copy and paste
export function onSlingTurretRockCollision(slingTurretRock: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
   const relationship = getEntityRelationship(slingTurretRock, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(slingTurretRock);
   const collidingEntityType = getEntityType(collidingEntity)!;

   // Collisions with embrasures are handled in the embrasures collision function
   if (collidingEntityType === EntityType.embrasure) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   // @Hack: do with collision bits
   // Pass over friendly spikes
   if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.floorPunjiSticks || collidingEntityType === EntityType.wallPunjiSticks) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   if (HealthComponentArray.hasComponent(collidingEntity)) {
      const transformComponent = TransformComponentArray.getComponent(slingTurretRock);
      const projectileComponent = ProjectileComponentArray.getComponent(slingTurretRock);

      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      const owner = validateEntity(projectileComponent.owner);
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, owner, 2, PlayerCauseOfDeath.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 75, hitDirection);

      destroyEntity(slingTurretRock);
   }
}