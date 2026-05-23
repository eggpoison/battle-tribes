import { DEFAULT_COLLISION_MASK, CollisionBit, Entity, EntityType, Settings, StatusEffect, Point, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent.js";
import { EntityRelationship, getEntityRelationship, TribeComponent } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponentArray } from "../../components/HealthComponent.js";
import { destroyEntity } from "../../world.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import Tribe from "../../Tribe.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import { IceArrowComponent } from "../../components/IceArrowComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createIceArrowConfig(position: Point, rotation: number, tribe: Tribe, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 20, 56), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   

   const tribeComponent = new TribeComponent(tribe);
   
   const projectileComponent = new ProjectileComponent(creator);

   const iceArrowComponent = new IceArrowComponent();
   
   return {
      entityType: EntityType.iceArrow,
      components: [
         transformComponent,
         tribeComponent,
         projectileComponent,
         iceArrowComponent
      ],
      lights: []
   };
}

export function onIceArrowCollision(arrow: Entity, collidingEntity: Entity): void {
   // Don't damage any friendly entities
   if (getEntityRelationship(arrow, collidingEntity) === EntityRelationship.friendly) {
      return;
   }
   
   if (HealthComponentArray.hasComponent(collidingEntity)) {
      if (StatusEffectComponentArray.hasComponent(collidingEntity)) {
         applyStatusEffect(collidingEntity, StatusEffect.freezing, 3 * Settings.TICK_RATE);
      }
      
      destroyEntity(arrow);
   }
}