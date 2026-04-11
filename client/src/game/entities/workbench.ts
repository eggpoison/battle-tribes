import { Point, EntityType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createCraftingStationComponentData } from "../entity-components/server-components/CraftingStationComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createWorkbenchConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;
   
   // @TEMPORARY: So that the structure placement works for placing workbenches in the corner of walls
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 80), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   // const hitbox1 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 72, 80), new Point(0, 0), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   // hitboxes.push(hitbox1);
   // const hitbox2 = createHitbox(hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, 0), rotation, 80, 72), new Point(0, 0), 1.6, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   // hitboxes.push(hitbox2);
   
   return {
      entityType: EntityType.workbench,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createCraftingStationComponentData()
      ],
      clientComponentData: []
   };
}