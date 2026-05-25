import { HitboxCollisionType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { InguYetukLaserComponent } from "../../components/InguYetukLaserComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createInguYetukLaserConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 12), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const statusEffectComponent = new StatusEffectComponent(0);

   const inguYetukLaserComponent = new InguYetukLaserComponent();

   return {
      entityType: EntityType.inguYetukLaser,
      components: [
         transformComponent,
         statusEffectComponent,
         inguYetukLaserComponent
      ],
      lights: []
   };
}
