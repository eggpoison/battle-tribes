import { Point, EntityType, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createPlanterBoxComponentData } from "../entity-components/server-components/PlanterBoxComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";
import { EntityServerComponentData, EntityServerComponentDataEntries } from "../networking/packet-snapshots";

export function createPlanterBoxConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 80, 80);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.planterBox,
      serverComponentData: new Map([
         [ServerComponentType.transform, createTransformComponentData(hitboxes)],
         [ServerComponentType.health, createHealthComponentData()],
         [ServerComponentType.statusEffect, createStatusEffectComponentData()],
         [ServerComponentType.structure, createStructureComponentData()],
         [ServerComponentType.tribe, createTribeComponentData(tribe)],
         [ServerComponentType.planterBox, createPlanterBoxComponentData()]
      // @HACK
      ] as EntityServerComponentDataEntries<ServerComponentType>) as EntityServerComponentData,
      clientComponentData: new Map()
   };
}