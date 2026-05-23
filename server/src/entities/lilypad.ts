import { CollisionBit, DEFAULT_COLLISION_MASK, Point, HitboxCollisionType, CircularBox, EntityType } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createLilypadConfig(position: Point, rotation: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), rotation, 28), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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