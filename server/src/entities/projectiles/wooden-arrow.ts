import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { AMMO_INFO_RECORD, ServerComponentType } from "battletribes-shared/components";
import { EntityType, DamageSource, Entity } from "battletribes-shared/entities";
import { angleToPoint, Point, polarVec2 } from "battletribes-shared/utils";
import { HealthComponentArray, addLocalInvulnerabilityHash, canDamageEntity, damageEntity } from "../../components/HealthComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent";
import { EntityConfig } from "../../components";
import { AttackEffectiveness } from "battletribes-shared/entity-damage-types";
import { addHitboxToTransformComponent, attachHitbox, TransformComponent, TransformComponentArray } from "../../components/TransformComponent";
import { ProjectileComponent, ProjectileComponentArray } from "../../components/ProjectileComponent";
import { ItemType } from "battletribes-shared/items/items";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { entityExists, getEntityType } from "../../world";
import Tribe from "../../Tribe";
import { applyKnockback, getHitboxVelocity, Hitbox } from "../../hitboxes";

export function createWoodenArrowConfig(position: Point, rotation: number, tribe: Tribe, owner: Entity): EntityConfig {
   const transformComponent = new TransformComponent();
   transformComponent.isAffectedByGroundFriction = false;
   
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 12, 64), 0.025, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK & ~CollisionBit.arrowPassable, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   

   const tribeComponent = new TribeComponent(tribe);

   const projectileComponent = new ProjectileComponent(owner);
   
   return {
      entityType: EntityType.woodenArrow,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.tribe]: tribeComponent,
         [ServerComponentType.projectile]: projectileComponent
      },
      lights: []
   };
}

// @Cleanup: Copy and paste
export function onWoodenArrowHitboxCollision(arrow: Entity, collidingEntity: Entity, affectedHitbox: Hitbox, collidingHitbox: Hitbox, collisionPoint: Point): void {
   const tribeComponent = TribeComponentArray.getComponent(arrow);
   const collidingEntityType = getEntityType(collidingEntity);

   // Collisions with embrasures are handled in the embrasures collision function
   if (collidingEntityType === EntityType.embrasure) {
      const collidingEntityTribeComponent = TribeComponentArray.getComponent(collidingEntity);
      if (tribeComponent.tribe === collidingEntityTribeComponent.tribe) {
         return;
      }
   }

   // Don't collide with anything attached to the owner
   const projectileComponent = ProjectileComponentArray.getComponent(arrow);
   if (entityExists(projectileComponent.creator)) {
      const creatorTransformComponent = TransformComponentArray.getComponent(projectileComponent.creator);
      const creatorHitbox = creatorTransformComponent.hitboxes[0];
      if (collidingHitbox.rootEntity === creatorHitbox.rootEntity) {
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

   if (!HealthComponentArray.hasComponent(collidingEntity)) {
      return;
   }

   // Don't collide with anything when the arrow is being carried
   // @Speed: faster to just change its collision group
   if (affectedHitbox.parent !== null) {
      return;
   }

   // Don't damage if the arrow is moving too slow
   if (getHitboxVelocity(affectedHitbox).magnitude() < 10) {
      return;
   } 

   const healthComponent = HealthComponentArray.getComponent(collidingEntity);
   const attackHash = "wooden-arrow-" + arrow;
   if (canDamageEntity(healthComponent, attackHash)) {
      const ammoInfo = AMMO_INFO_RECORD[ItemType.wood];
   
      const hitDirection = affectedHitbox.box.position.angleTo(collidingHitbox.box.position);
      
      const attacker = entityExists(projectileComponent.creator) ? projectileComponent.creator : arrow;

      const damage = 2 * (projectileComponent.isBlocked ? 0.5 : 1);
      const knockback = 150 * (projectileComponent.isBlocked ? 0.5 : 1);
      damageEntity(collidingHitbox, attacker, damage, DamageSource.arrow, AttackEffectiveness.effective, collisionPoint, 0);
      applyKnockback(collidingHitbox, polarVec2(knockback, hitDirection));
      addLocalInvulnerabilityHash(collidingEntity, attackHash, 9);
   
      if (StatusEffectComponentArray.hasComponent(collidingEntity) && ammoInfo.statusEffect !== null) {
         applyStatusEffect(collidingEntity, ammoInfo.statusEffect.type, ammoInfo.statusEffect.durationTicks);
      }
   }

   // When the hitbox is pushed to the point that it is no longer travelling in the direction it is facing, attach it to the colliding hitbox
   // Lodge the arrow in the entity when it's slow enough
   // @HACK commented out the if check so that it just always attaches so a shot is easier to get
   // const arrowVelocity = getHitboxVelocity(affectedHitbox);
   // if (arrowVelocity.magnitude() < 50 || arrowVelocity.calculateDotProduct(angleToPoint(affectedHitbox.box.angle)) < 0) {
      attachHitbox(affectedHitbox, collidingHitbox, false);
   // }
}