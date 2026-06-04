import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { DecorationComponent } from "../components/DecorationComponent.js";
import { createHitbox, setHitboxIsStatic } from "../hitboxes.js";
import { createRectangularBox, HitboxCollisionType } from "../../../shared/dist/boxes.js";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../shared/dist/collision.js";
import { DecorationType } from "../../../shared/dist/components.js";
import { EntityType } from "../../../shared/dist/entities.js";

export function createDecorationConfig(x: number, y: number, angle: number, decorationType: DecorationType): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = createHitbox(transformComponent, null, createRectangularBox(x, y, 0, 0, angle, 16, 16), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsStatic(hitbox);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const decorationComponent = new DecorationComponent(decorationType);
   
   return {
      entityType: EntityType.decoration,
      components: [
         transformComponent,
         decorationComponent
      ],
      lights: []
   };
}