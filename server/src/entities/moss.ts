import { HitboxCollisionType } from "../../../shared/src/boxes/boxes";
import { RectangularBox } from "../../../shared/src/boxes/RectangularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../shared/src/collision";
import { ServerComponentType } from "../../../shared/src/components";
import { EntityType } from "../../../shared/src/entities";
import { Point } from "../../../shared/src/utils";
import { EntityConfig } from "../components";
import { MossComponent } from "../components/MossComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../components/TransformComponent";
import { Hitbox } from "../hitboxes";

export function createMossConfig(position: Point, angle: number, size: number, colour: number): EntityConfig {
   const transformComponent = new TransformComponent();
   
   const hitbox = new Hitbox(transformComponent, null, true, new RectangularBox(position, new Point(0, 0), angle, 40, 40), 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   addHitboxToTransformComponent(transformComponent, hitbox);
   
   const mossComponent = new MossComponent(size, colour);
   
   return {
      entityType: EntityType.moss,
      components: {
         [ServerComponentType.transform]: transformComponent,
         [ServerComponentType.moss]: mossComponent
      },
      lights: []
   };
}