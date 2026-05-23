import { Point, EntityType, DEFAULT_COLLISION_MASK, CollisionBit, HitboxCollisionType, RectangularBox, StatusEffect } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { HealthComponent } from "../components/HealthComponent.js";
import { StatusEffectComponent } from "../components/StatusEffectComponent.js";
import { SpikyBastardComponent } from "../components/SpikyBastardComponent.js";
import { Hitbox } from "../hitboxes.js";
   
export function createSpikyBastardConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 16, 32), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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