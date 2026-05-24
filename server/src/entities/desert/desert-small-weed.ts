import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { DesertSmallWeedComponent } from "../../components/DesertSmallWeedComponent.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createDesertSmallWeedConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 16), 0.4, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(2);

   const energyStoreComponent = new EnergyStoreComponent(50);
   
   const desertSmallWeedComponent = new DesertSmallWeedComponent();
   
   return {
      entityType: EntityType.desertSmallWeed,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         energyStoreComponent,
         desertSmallWeedComponent
      ],
      lights: []
   };
}