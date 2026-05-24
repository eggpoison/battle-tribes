import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { DesertBushLivelyComponent } from "../../components/DesertBushLivelyComponent.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createDesertBushLivelyConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 24), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);

   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(3);
   
   const energyStoreComponent = new EnergyStoreComponent(200);
   
   const desertBushLivelyComponent = new DesertBushLivelyComponent();
   
   return {
      entityType: EntityType.desertBushLively,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         energyStoreComponent,
         desertBushLivelyComponent
      ],
      lights: []
   };
}