import { HitboxCollisionType, HitboxTag, CollisionBit, DEFAULT_COLLISION_MASK, EntityType, createCircularBox } from "battletribes-shared";
import { EntityConfig } from "../../components.js";
import { RiverSteppingStoneComponent } from "../../components/RiverSteppingStoneComponent.js";
import { addHitboxToTransformComponent, TransformComponent } from "../../components/TransformComponent.js";
import { createHitbox, setHitboxTag } from "../../hitboxes.js";

export const enum RiverSteppingStoneSize {
   small,
   medium,
   large
}

export function createRiverSteppingStoneConfig(x: number, y: number, angle: number, size: RiverSteppingStoneSize): EntityConfig {
   const transformComponent = new TransformComponent();

   let radius: number;
   let tag: HitboxTag;
   switch (size) {
      case RiverSteppingStoneSize.small: {
         radius = 16;
         tag = HitboxTag.riverSteppingStoneSmall;
         break;
      }
      case RiverSteppingStoneSize.medium: {
         radius = 24;
         tag = HitboxTag.riverSteppingStoneMedium;
         break;
      }
      case RiverSteppingStoneSize.large: {
         radius = 28;
         tag = HitboxTag.riverSteppingStoneLarge;
         break;
      }
   }

   const hitbox = createHitbox(transformComponent, null, createCircularBox(x, y, 0, 0, angle, radius), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxTag(hitbox, tag);
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