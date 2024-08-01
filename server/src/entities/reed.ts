import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../components";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, HitboxCollisionBit, DEFAULT_HITBOX_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";
import { Point, randInt } from "webgl-test-shared/dist/utils";

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
         hitboxes: [new RectangularHitbox(0, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 4, 4, 0)]
      },
      [ServerComponentType.layeredRod]: {
         numLayers: randInt(7, 11),
         colour: {
            r: 0.68,
            g: 1,
            b: 0.66
         }
      }
   };
}