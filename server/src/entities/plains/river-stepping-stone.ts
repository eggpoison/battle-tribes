import { HitboxCollisionType, HitboxFlag, CircularBox, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, Point } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { RiverSteppingStoneComponent } from "../../components/RiverSteppingStoneComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { Hitbox } from "../../hitboxes.js";

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