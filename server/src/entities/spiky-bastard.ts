import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { HealthComponent } from "../components/HealthComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { SpikyBastardComponent } from "../components/SpikyBastardComponent.js";
import { createHitbox, setHitboxIsStatic } from "../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { EntityType } from "../../../shared/dist/entities.js";
import { StatusEffect } from "../../../shared/dist/status-effects.js";
   
export function createSpikyBastardConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 16, 32), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const healthComponent = new HealthComponent(5);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding | StatusEffect.burning);

   const spikyBastardComponent = new SpikyBastardComponent();
   
   return {
      entityType: EntityType.spikyBastard,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         spikyBastardComponent
      ],
      lights: []
   };
}