import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, StatusEffect, Point, HitboxCollisionType, CircularBox } from "battletribes-shared";
import { HealthComponent } from "../../components/HealthComponent.js";
import { PebblumComponent } from "../../components/PebblumComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createPebblumConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   // Body
   const bodyHitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, -4), rotation, 10 * 2), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, bodyHitbox);
   // Nose
   const noseHitbox = new Hitbox(transformComponent, bodyHitbox, true, new CircularBox(new Point(0, 0), new Point(0, 6), 0, 8 * 2), 0.3, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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