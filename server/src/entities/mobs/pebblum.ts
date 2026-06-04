import { HealthComponent } from "../../components/HealthComponent.js";
import { PebblumComponent } from "../../components/PebblumComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { createHitbox } from "../../hitboxes.js";
import { createCircularBox, HitboxCollisionType } from "../../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/dist/collision.js";
import { EntityType } from "../../../../shared/dist/entities.js";
import { StatusEffect } from "../../../../shared/dist/status-effects.js";

export function createPebblumConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Body
   const bodyHitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, -4, angle, 10 * 2), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   // Nose
   const noseHitbox = createHitbox(transformComponent, bodyHitbox, createCircularBox(0, 0, 0, 6, 0, 8 * 2), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, noseHitbox);
   
   const healthComponent = new HealthComponent(20);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning | StatusEffect.poisoned);
   
   // @Incomplete?
   const pebblumComponent = new PebblumComponent(0);
   
   return {
      entityType: EntityType.pebblum,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         pebblumComponent
      ],
      lights: []
   };
}