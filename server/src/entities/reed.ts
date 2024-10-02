import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../components";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "battletribes-shared/collision";
import { EntityType } from "battletribes-shared/entities";
import { Point, randInt } from "battletribes-shared/utils";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.layeredRod;

export function createReedConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.reed,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), 4, 4, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.layeredRod]: {
         numLayers: randInt(7, 11),
         colour: {
            r: 0.68,
            g: 1,
            b: 0.66,
            a: 1
         }
      }
   };
}