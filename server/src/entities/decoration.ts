import { DecorationType, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, HitboxCollisionType, RectangularBox } from "battletribes-shared";
import { EntityConfig } from "../components.js";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent.js";
import { DecorationComponent } from "../components/DecorationComponent.js";
import { Hitbox } from "../hitboxes.js";

export function createDecorationConfig(x: number, y: number, angle: number, decorationType: DecorationType): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(x, y, 0, 0, angle, 16, 16), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
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