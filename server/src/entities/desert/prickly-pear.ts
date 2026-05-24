import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, StatusEffect, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { EnergyStoreComponent } from "../../components/EnergyStoreComponent.js";
import { HealthComponent } from "../../components/HealthComponent.js";
import { PricklyPearComponent } from "../../components/PricklyPearComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createPricklyPearConfig(x: number, y: number, offsetX: number, offsetY: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, offsetX, offsetY, angle, 10), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(StatusEffect.bleeding);
   
   const healthComponent = new HealthComponent(2);

   const energyStoreComponent = new EnergyStoreComponent(50);

   const pricklyPearComponent = new PricklyPearComponent();
   
   return {
      entityType: EntityType.pricklyPear,
      components: [
         transformComponent,
         statusEffectComponent,
         healthComponent,
         energyStoreComponent,
         pricklyPearComponent
      ],
      lights: []
   };
}