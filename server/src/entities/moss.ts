import { createRectangularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { EntityType } from "../../../shared/dist/entities.js";
import { EntityConfig } from "../components.js";
import { MossComponent } from "../components/MossComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { createHitbox } from "../hitboxes.js";

export function createMossConfig(x: number, y: number, angle: number, size: number, colour: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 40, 40), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
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