import { CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect, HitboxCollisionType, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

export function createFibrePlantConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 36), 1, HitboxCollisionType.soft, CollisionBit.plant, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(10);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   return {
      entityType: EntityType.fibrePlant,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent
      ],
      lights: []
   };
}