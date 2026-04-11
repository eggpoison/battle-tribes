import { EntityConfig } from "../components";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { Point } from "battletribes-shared/utils";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { CircularBox } from "battletribes-shared/boxes/CircularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { EntityType } from "battletribes-shared/entities";
import { Hitbox } from "../hitboxes";

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