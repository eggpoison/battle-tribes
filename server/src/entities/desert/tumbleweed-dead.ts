import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect, randFloat, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TumbleweedDeadComponent } from "../../components/TumbleweedDeadComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createTumbleweedDeadConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 40), randFloat(0.19, 0.23), HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(2);
   
   const tumbleweedDeadComponent = new TumbleweedDeadComponent();
   
   return {
      entityType: EntityType.tumbleweedDead,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         tumbleweedDeadComponent
      ],
      lights: []
   };
}