import { DEFAULT_COLLISION_MASK, CollisionBit } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Point } from "battletribes-shared/utils";
import { SlimeSpitComponent } from "../../components/SlimeSpitComponent";
import { EntityConfig } from "../../components";
import { ServerComponentType } from "battletribes-shared/components";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import { RectangularBox } from "battletribes-shared/boxes/RectangularBox";
import { Hitbox } from "../../hitboxes";

export function createSlimeSpitConfig(position: Point, rotation: number, size: number): EntityConfig {
   const transformComponent = new TransformComponent();

   const hitboxSize = size === 0 ? 20 : 30;
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), rotation, hitboxSize, hitboxSize), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const slimeSpitComponent = new SlimeSpitComponent(size);
   
   return {
      entityType: EntityType.slimeSpit,
      components: [
         transformComponent,
         slimeSpitComponent
         ],
      lights: []
   };
}