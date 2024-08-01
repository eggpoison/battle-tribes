import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentConfig } from "../components";
import { Point, randFloat, randInt } from "webgl-test-shared/dist/utils";
import { EntityType } from "webgl-test-shared/dist/entities";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { HitboxCollisionType, RectangularHitbox } from "webgl-test-shared/dist/hitboxes/hitboxes";

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
         hitboxes: [new RectangularHitbox(0, new Point(0, 0), HitboxCollisionType.soft, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, 0, 4, 4, 0)]
      },
      [ServerComponentType.layeredRod]: {
         numLayers: randInt(2, 5),
         colour: {
            r: randFloat(0.4, 0.5),
            g: randFloat(0.83, 0.95),
            b: randFloat(0.2, 0.3)
         }
      }
   };
}