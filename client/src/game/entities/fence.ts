import { Point, EntityType, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createFenceComponentData } from "../entity-components/server-components/FenceComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createFenceConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 20, 20);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.fence,
      serverComponentData: {
         [ServerComponentType.transform]: createTransformComponentData(hitboxes),
         [ServerComponentType.health]: createHealthComponentData(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentData(),
         [ServerComponentType.structure]: createStructureComponentData(),
         [ServerComponentType.tribe]: createTribeComponentData(tribe),
         [ServerComponentType.fence]: createFenceComponentData()
      },
      clientComponentData: {}
   };
}