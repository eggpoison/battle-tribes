import { StatusEffectComponentArray, applyStatusEffect } from "../../components/StatusEffectComponent.js";
import { EntityRelationship, getEntityRelationship, TribeComponent } from "../../components/TribeComponent.js";
import { EntityConfig } from "../../components.js";
import { HealthComponentArray } from "../../components/HealthComponent.js";
import { destroyEntity } from "../../world.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import Tribe from "../../Tribe.js";
import { ProjectileComponent } from "../../components/ProjectileComponent.js";
import { IceArrowComponent } from "../../components/IceArrowComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { Entity, EntityType } from "../../../../shared/dist/entities.js";
import { Settings } from "../../../../shared/dist/settings.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

export function createIceArrowConfig(x: number, y: number, rotation: number, tribe: Tribe, creator: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   transformComponent.isAffectedByGroundFriction = false;

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, rotation, 20, 56), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
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