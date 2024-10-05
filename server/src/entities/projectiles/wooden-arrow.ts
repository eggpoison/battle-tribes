import { DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { AMMO_INFO_RECORD, ServerComponentType } from "battletribes-shared/components";
import { EntityType, PlayerCauseOfDeath, EntityID } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HealthComponentArray, damageEntity } from "../../components/HealthComponent";
import { applyKnockback, PhysicsComponent } from "../../components/PhysicsComponent";
import { EntityRelationship, TribeComponent, TribeComponentArray, getEntityRelationship } from "../../components/TribeComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ProjectileComponent, ProjectileComponentArray } from "../../components/ProjectileComponent";
import { ItemType } from "battletribes-shared/items/items";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";
import { destroyEntity, getEntityType, validateEntity } from "../../world";
import Tribe from "../../Tribe";

type ComponentTypes = ServerComponentType.transform | ServerComponentType.physics | ServerComponentType.tribe | ServerComponentType.projectile;

export function createWoodenArrowConfig(tribe: Tribe, owner: EntityID): EntityConfig<ComponentTypes> {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(new RectangularBox(new Point(0, 0), 12, 64, 0), 0.5, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK & ~HitboxCollisionBit.ARROW_PASSABLE, []);
   transformComponent.addHitbox(hitbox, null);
   
   const physicsComponent = new PhysicsComponent();
   physicsComponent.isAffectedByGroundFriction = false;
   physicsComponent.isImmovable = true;

   const tribeComponent = new TribeComponent(tribe);

   const projectileComponent = new ProjectileComponent(owner);
   
   return {
      entityType: EntityType.woodenArrow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.physics]: physicsComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent
      }
   };
}

// @Cleanup: Copy and paste
export function onWoodenArrowCollision(arrow: EntityID, collidingEntity: EntityID, collisionPoint: Point): void {
   // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
   const relationship = getEntityRelationship(arrow, collidingEntity);
   if (relationship === EntityRelationship.friendly) {
      return;
   }
   
   const tribeComponent = TribeComponentArray.getComponent(arrow);
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
      const transformComponent = TransformComponentArray.getComponent(arrow);
      const projectileComponent = ProjectileComponentArray.getComponent(arrow);

      const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

      const ammoInfo = AMMO_INFO_RECORD[ItemType.wood];

      const owner = validateEntity(projectileComponent.creator);
      const hitDirection = transformComponent.position.calculateAngleBetween(collidingEntityTransformComponent.position);
      
      const damage = 2 * (projectileComponent.isBlocked ? 0.5 : 1);
      const knockback = 150 * (projectileComponent.isBlocked ? 0.5 : 1);
      damageEntity(collidingEntity, owner, damage, PlayerCauseOfDeath.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingEntity, knockback, hitDirection);

      if (StatusEffectComponentArray.hasComponent(collidingEntity) && ammoInfo.statusEffect !== null) {
         applyStatusEffect(collidingEntity, ammoInfo.statusEffect.type, ammoInfo.statusEffect.durationTicks);
      }

      destroyEntity(arrow);
   }
}