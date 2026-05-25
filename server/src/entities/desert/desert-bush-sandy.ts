import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect, randInt, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { DesertBushSandyComponent } from "../../components/DesertBushSandyComponent.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../../hitboxes.js";

export function createDesertBushSandyConfig(x: number, y: number, angle: number): EntityConfig {
   const size = randInt(0, 1);
   
   const transformComponent = new TransformComponent();

   const radius = size === 0 ? 32 : 40;
   const mass = size === 0 ? 1.2 : 1.6;
   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, radius), mass, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(size === 0 ? 3 : 5);
      
   const energyStoreComponent = new EnergyStoreComponent(150);

   const desertBushSandyComponent = new DesertBushSandyComponent(size);
   
   return {
      entityType: EntityType.desertBushSandy,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         energyStoreComponent,
         desertBushSandyComponent
      ],
      lights: []
   };
}