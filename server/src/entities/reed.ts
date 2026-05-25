import { CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Colour, randInt, HitboxCollisionType, createRectangularBox } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { LayeredRodComponent } from "../components/LayeredRodComponent.js";
import { createHitbox, setHitboxIsStatic } from "../hitboxes.js";

export function createReedConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 4, 4), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const colour: Colour = {
      r: 0.68,
      g: 1,
      b: 0.66,
      a: 1
   };
   const layeredRodComponent = new LayeredRodComponent(randInt(7, 11), colour);
   
   return {
      entityType: EntityType.reed,
      components: [
         transformComponent,
         layeredRodComponent
      ],
      lights: []
   };
}