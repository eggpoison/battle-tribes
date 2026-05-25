import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, Entity, EntityType, StatusEffect, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { PricklyPearFragmentProjectileComponent } from "../../components/PricklyPearFragmentComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createPricklyPearFragmentProjectileConfig(x: number, y: number, angle: number, parentCactus: Entity): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 10), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const pricklyPearFragmentProjectileComponent = new PricklyPearFragmentProjectileComponent(parentCactus);
   
   return {
      entityType: EntityType.pricklyPearFragmentProjectile,
      components: [
         transformComponent,
         statusEffectComponent,
         pricklyPearFragmentProjectileComponent
      ],
      lights: []
   };
}