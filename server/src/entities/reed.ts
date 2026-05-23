import { CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Colour, Point, randInt, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { LayeredRodComponent } from "../components/LayeredRodComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createReedConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 4, 4), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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