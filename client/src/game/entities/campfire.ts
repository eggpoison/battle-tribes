import { Point, EntityType, DEFAULT_COLLISION_MASK, CollisionBit, CircularBox, HitboxCollisionType, HitboxFlag } from "webgl-test-shared";
import { createCampfireComponentData } from "../entity-components/server-components/CampfireComponent";
import { createCookingComponentData } from "../entity-components/server-components/CookingComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createInventoryComponentData } from "../entity-components/server-components/InventoryComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createCampfireConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = new CircularBox(position, new Point(0, 0), rotation, 52);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.campfire,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createInventoryComponentData([]),
         createCookingComponentData(),
         createCampfireComponentData()
      ],
      clientComponentData: []
   };
}