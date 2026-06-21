import { createRectangularBox, HitboxCollisionType } from "../../../../shared/src/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { EntityType } from "../../../../shared/src/entities";
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
   const hitboxes: Hitbox[] = [];
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