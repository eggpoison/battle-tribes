import { DEFAULT_COLLISION_MASK, CollisionBit, EntityType, HitboxCollisionType, createRectangularBox } from "battletribes-shared";
import { SlimeSpitComponent } from "../../components/SlimeSpitComponent.js";
import { EntityConfig } from "../../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox } from "../../hitboxes.js";

export function createSlimeSpitConfig(x: number, y: number, angle: number, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitboxSize = size === 0 ? 20 : 30;
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, hitboxSize, hitboxSize), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const slimeSpitComponent = new SlimeSpitComponent(size);
   
   return {
      entityType: EntityType.slimeSpit,
      components: [
         transformComponent,
         slimeSpitComponent
         ],
      lights: []
   };
}