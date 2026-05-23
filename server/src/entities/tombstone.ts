import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, StatusEffect, Point, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { EntityConfig } from "../components.js";
import { HealthComponent } from "../components/HealthComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { TombstoneComponent } from "../components/TombstoneComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createTombstoneConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 48, 88), 1.25, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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