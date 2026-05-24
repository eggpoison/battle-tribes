import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { DesertShrubComponent } from "../../components/DesertShrubComponent.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createDesertShrubConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 36), 1.5, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);

   const healthComponent = new HealthComponent(5);
      
   const energyStoreComponent = new EnergyStoreComponent(250);
   
   const desertShrubComponent = new DesertShrubComponent();
   
   return {
      entityType: EntityType.desertShrub,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         energyStoreComponent,
         desertShrubComponent
      ],
      lights: []
   };
}