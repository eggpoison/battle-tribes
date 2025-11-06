import { DecorationType, ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { DecorationComponent } from "../components/DecorationComponent";
import { Hitbox } from "../hitboxes";

export function createDecorationConfig(position: Point, rotation: number, decorationType: DecorationType): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, 16, 16), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitbox.isStatic = true;
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const decorationComponent = new DecorationComponent(decorationType);
   
   return {
      entityType: EntityType.decoration,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.decoration]: decorationComponent
      },
      lights: []
   };
}