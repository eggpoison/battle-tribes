import { CollisionBit, DEFAULT_COLLISION_MASK, Point, HitboxCollisionType, CircularBox, EntityType } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createLilypadConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(x, y, 0, 0, angle, 28), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   return {
      entityType: EntityType.lilypad,
      components: [
         transformComponent,
      ],
      lights: []
   };
}