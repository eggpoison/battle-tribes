import { ServerComponentType } from "battletribes-shared/components";
import { Point, randInt } from "battletribes-shared/utils";
import { EntityConfig } from "../../components";
import { createGlurbHeadSegmentConfig } from "./glurb-head-segment";
import { createGlurbBodySegmentConfig } from "./glurb-body-segment";
import { createGlurbTailSegmentConfig } from "./glurb-tail-segment";
import { tetherHitboxes } from "../../tethers";
import { CircularBox } from "../../../../shared/src/boxes/CircularBox";
import { Hitbox } from "../../hitboxes";

// @Cleanup: Shouldn't be globally exported!!!!
export function tetherGlurbSegments(hitbox1: Hitbox, hitbox2: Hitbox): void {
   const tetherIdealDistance = (hitbox1.box as CircularBox).radius + (hitbox2.box as CircularBox).radius - 18;
   tetherHitboxes(hitbox1, hitbox2, tetherIdealDistance, 15, 0.5);
}

export function createGlurbConfig(position: Point, angle: number, numSegments: number): ReadonlyArray<EntityConfig> {
   const configs = new Array<EntityConfig>();
   
   const headConfig = createGlurbHeadSegmentConfig(position, angle, numSegments);
   configs.push(headConfig);
   
   let lastHitbox = headConfig.components[ServerComponentType.transform]!.hitboxes[0];
   let currentPos = position.copy();
   for (let i = 0; i < numSegments - 1; i++) {
      const newPos = currentPos.offset(30, angle + Math.PI);
      currentPos.x = newPos.x;
      currentPos.y = newPos.y;
      
      let config: EntityConfig;
      if (i === numSegments - 2) {
         config = createGlurbTailSegmentConfig(currentPos.copy(), angle);
      } else {
         config = createGlurbBodySegmentConfig(currentPos.copy(), angle);
      }
      configs.push(config);

      const hitbox = config.components[ServerComponentType.transform]!.hitboxes[0];
      tetherGlurbSegments(hitbox, lastHitbox);
      lastHitbox = hitbox;
   }

   return configs;
}