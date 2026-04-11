import { ServerComponentType } from "battletribes-shared/components";
import { EntityConfig } from "../components";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Colour, Point, randInt } from "battletribes-shared/utils";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { LayeredRodComponent } from "../components/LayeredRodComponent";
import { Hitbox } from "../hitboxes";

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