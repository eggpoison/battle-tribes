import { HitboxCollisionType, RectangularBox, DEFAULT_COLLISION_MASK, CollisionBit, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { MossComponent } from "../components/MossComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createMossConfig(position: Point, angle: number, size: number, colour: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 40, 40), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const mossComponent = new MossComponent(size, colour);
   
   return {
      entityType: EntityType.moss,
      components: [
         transformComponent,
         mossComponent
      ],
      lights: []
   };
}