import { TribeComponent } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import Tribe from "../../Tribe.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";

export function createBallistaFrostcicleConfig(x: number, y: number, rotation: number, tribe: Tribe, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, rotation, 12, 80), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.arrowPassable);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);


   const tribeComponent = new TribeComponent(tribe);

   const projectileComponent = new ProjectileComponent(creator);
   
   return {
      entityType: EntityType.ballistaFrostcicle,
      components: [
         transformComponent,
         tribeComponent,
         projectileComponent
      ],
      lights: []
   };
}

// @Cleanup: Copy and paste
// export function onBallistaFrostcicleCollision(arrow: Entity, collidingEntity: Entity, collisionPoint: Point): void {
//    // Ignore friendlies, and friendly buildings if the ignoreFriendlyBuildings flag is set
//    const relationship = getEntityRelationship(arrow, collidingEntity);
//    if (relationship === EntityRelationship.friendly || relationship === EntityRelationship.friendlyBuilding) {
//       return;
//    }
   
//    const tribeComponent = TribeComponentArray.getComponent(arrow);
//    const collidingEntityType = getEntityType(collidingEntity);

//    // Collisions with embrasures are handled in the embrasures collision function
//    if (collidingEntityType === EntityType.embrasure) {
//       const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
//       if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
//          return;
//       }
//    }

//    // @Hack: do with collision bits
//    // Pass over friendly spikes
//    if (collidingEntityType === EntityType.floorSpikes || collidingEntityType === EntityType.wallSpikes || collidingEntityType === EntityType.floorPunjiSticks || collidingEntityType === EntityType.wallPunjiSticks) {
//       const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
//       if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
//          return;
//       }
//    }

//    if (HealthComponentArray.hasComponent(collidingEntity)) {
//       const transformComponent = TransformComponentArray.getComponent(arrow);
//       const projectileComponent = ProjectileComponentArray.getComponent(arrow);

//       const collidingEntityTransformComponent = TransformComponentArray.getComponent(collidingEntity);

//       const ammoInfo = AMMO_INFO_RECORD[ItemType.frostcicle];

//       const owner = validateEntity(projectileComponent.creator);
//       const hitDirection = transformComponent.position.angleTo(collidingEntityTransformComponent.position);
      
//       damageEntity(collidingEntity, owner, ammoInfo.damage, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
//       applyKnockback(collidingEntity, ammoInfo.knockback, hitDirection);

//       if (StatusEffectComponentArray.hasComponent(collidingEntity) && ammoInfo.statusEffect !== null) {
//          applyStatusEffect(collidingEntity, ammoInfo.statusEffect.type, ammoInfo.statusEffect.durationTicks);
//       }

//       destroyEntity(arrow);
//    }
// }