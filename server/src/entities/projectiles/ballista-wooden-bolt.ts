import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { ServerComponentType } from "battletribes-shared/components";
import { EntityType, Entity } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { TribeComponent } from "../../components/TribeComponent";
import { EntityConfig } from "../../components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { ProjectileComponent } from "../../components/ProjectileComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import Tribe from "../../Tribe";
import { Hitbox } from "../../hitboxes";

export function createBallistaWoodenBoltConfig(position: Point, rotation: number, tribe: Tribe, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 12, 80), 0.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.arrowPassable, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);


   const tribeComponent = new TribeComponent(tribe);

   const projectileComponent = new ProjectileComponent(creator);
   
   return {
      entityType: EntityType.ballistaWoodenBolt,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent
      },
      lights: []
   };
}

// @Cleanup: Copy and paste
// export function onBallistaWoodenBoltCollision(arrow: Entity, collidingEntity: Entity, collisionPoint: Point): void {
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

//       const ammoInfo = AMMO_INFO_RECORD[ItemType.wood];

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