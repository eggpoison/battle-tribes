import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import {ServerComponentType } from "battletribes-shared/components";
import { EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ProjectileComponent, ProjectileComponentArray } from "../../components/ProjectileComponent";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, getEntityType, validateEntity } from "../../world";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.physics
   | ServerComponentType.tribe
   | ServerComponentType.projectile;

export function createSlingTurretRockConfig(owner: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent()
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 12, 64, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;
   
   const ownerTribeComponent = TribeComponentArray.getComponent(owner);
   const tribeComponent = new TribeComponent(ownerTribeComponent.tribe);
   
   const projectileComponent = new ProjectileComponent(owner);
   
   return {
      entityType: EntityType.slingTurretRock,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent
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

      const owner = validateEntity(projectileComponent.creator);
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      damageEntity(collidingEntity, owner, 2, PlayerCauseOfDeath.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, 75, hitDirection);

      destroyEntity(slingTurretRock);
   }
}