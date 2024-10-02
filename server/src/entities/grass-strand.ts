import { ServerComponentType } from "battletribes-shared/components";
import { ComponentConfig } from "../components";
import { Point, randFloat, randInt } from "battletribes-shared/utils";
import { EntityType } from "battletribes-shared/entities";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "battletribes-shared/collision";
import { createHitbox, HitboxCollisionType } from "battletribes-shared/boxes/boxes";
import RectangularBox from "battletribes-shared/boxes/RectangularBox";

type ComponentTypes = ServerComponentType.transform
   | ServerComponentType.layeredRod;
   
export function createGrassStrandConfig(): ComponentConfig<ComponentTypes> {
   return {
      [ServerComponentType.transform]: {
         position: new Point(0, 0),
         rotation: 0,
         type: EntityType.grassStrand,
         collisionBit: COLLISION_BITS.default,
         collisionMask: DEFAULT_COLLISION_MASK,
         hitboxes: [createHitbox(new RectangularBox(new Point(0, 0), 4, 4, 0), 0, HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, [])]
      },
      [ServerComponentType.layeredRod]: {
         numLayers: randInt(2, 5),
         colour: {
            r: randFloat(0.4, 0.5),
            g: randFloat(0.83, 0.95),
            b: randFloat(0.2, 0.3),
            a: 1
         }
      }
   };
}