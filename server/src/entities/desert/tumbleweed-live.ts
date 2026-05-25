import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { TumbleweedLiveComponent } from "../../components/TumbleweedLiveComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

export function createTumbleweedLiveConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 40), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(2);
   
   const tumbleweedLiveComponent = new TumbleweedLiveComponent();
   
   return {
      entityType: EntityType.tumbleweedLive,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         tumbleweedLiveComponent
      ],
      lights: []
   };
}