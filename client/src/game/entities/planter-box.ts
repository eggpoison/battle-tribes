import { EntityType, DEFAULT_COLLISION_MASK, CollisionBit, HitboxCollisionType, createRectangularBox } from "webgl-test-shared";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createPlanterBoxComponentData } from "../entity-components/server-components/PlanterBoxComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createPlanterBoxConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 80, 80);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.planterBox,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createPlanterBoxComponentData()
      ],
      clientComponentData: []
   };
}