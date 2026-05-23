import { HitboxCollisionType, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { InguYetukLaserComponent } from "../../components/InguYetukLaserComponent.js";
import { StatusEffectComponent } from "../../components/StatusEffectComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

export function createInguYetukLaserConfig(position: Point, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, 12), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
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
