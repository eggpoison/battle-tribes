import { Point, EntityType, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createCookingComponentData } from "../entity-components/server-components/CookingComponent";
import { createFurnaceComponentData } from "../entity-components/server-components/FurnaceComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createInventoryComponentData } from "../entity-components/server-components/InventoryComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createFurnaceConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 64, 64);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.furnace,
      serverComponentData: {
         [ServerComponentType.transform]: createTransformComponentData(hitboxes),
         [ServerComponentType.health]: createHealthComponentData(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentData(),
         [ServerComponentType.structure]: createStructureComponentData(),
         [ServerComponentType.tribe]: createTribeComponentData(tribe),
         [ServerComponentType.inventory]: createInventoryComponentData({}),
         [ServerComponentType.cooking]: createCookingComponentData(),
         [ServerComponentType.furnace]: createFurnaceComponentData(),
      },
      clientComponentData: {}
   };
}