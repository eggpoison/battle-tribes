import { EntityType, CollisionBit, DEFAULT_COLLISION_MASK, RectangularBox, HitboxCollisionType, createRectangularBox } from "webgl-test-shared";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createFloorSignConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 56, 40);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   hitboxes.push(hitbox);
   
   return {
      entityType: EntityType.floorSign,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createStatusEffectComponentData(),
         createHealthComponentData(),
         createTribeComponentData(tribe),
         createStructureComponentData(),
         { message: "" }
      ],
      clientComponentData: []
   };
}