import { HitboxCollisionType, HitboxFlag } from "../../../../shared/src/boxes/boxes";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
import { EntityConfig } from "../../components";
import { RiverSteppingStoneComponent } from "../../components/RiverSteppingStoneComponent";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent";
import { Hitbox } from "../../hitboxes";

export const enum RiverSteppingStoneSize {
   small,
   medium,
   large
}

export function createRiverSteppingStoneConfig(position: Point, angle: number, size: RiverSteppingStoneSize): EntityConfig {
   const transformComponent = new TransformComponent();

   let radius: number;
   let flag: HitboxFlag;
   switch (size) {
      case RiverSteppingStoneSize.small: {
         radius = 16;
         flag = HitboxFlag.RIVER_STEPPING_STONE_SMALL;
         break;
      }
      case RiverSteppingStoneSize.medium: {
         radius = 24;
         flag = HitboxFlag.RIVER_STEPPING_STONE_MEDIUM;
         break;
      }
      case RiverSteppingStoneSize.large: {
         radius = 28;
         flag = HitboxFlag.RIVER_STEPPING_STONE_LARGE;
         break;
      }
   }

   const hitbox = new Hitbox(transformComponent, null, true, new CircularBox(position, new Point(0, 0), angle, radius), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [flag]);
   addHitboxToTransformComponent(transformComponent, hitbox);

   const riverSteppingStoneComponent = new RiverSteppingStoneComponent();
   
   return {
      entityType: EntityType.riverSteppingStone,
      components: [
         transformComponent,
         riverSteppingStoneComponent
      ],
      lights: []
   };
}