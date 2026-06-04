import { createCircularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { EntityType } from "../../../shared/dist/entities.js";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { createHitbox, setHitboxIsStatic } from "../hitboxes.js";

export function createLilypadConfig(x: number, y: number, angle: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, 28), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   return {
      entityType: EntityType.lilypad,
      components: [
         transformComponent,
      ],
      lights: []
   };
}