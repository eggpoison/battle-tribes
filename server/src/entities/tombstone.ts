import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { EntityConfig } from "../components.js";
import { HealthComponent } from "../components/HealthComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { TombstoneComponent } from "../components/TombstoneComponent.js";
import { createHitbox } from "../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { EntityType } from "../../../shared/dist/entities.js";
import { StatusEffect } from "../../../shared/dist/status-effects.js";

export function createTombstoneConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 48, 88), 1.25, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const healthComponent = new HealthComponent(50);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.poisoned);
   
   const tombstoneComponent = new TombstoneComponent();
   
   return {
      entityType: EntityType.tombstone,
      components: [
         transformComponent,
         healthComponent,
         statusEffectComponent,
         tombstoneComponent
      ],
      lights: []
   };
}