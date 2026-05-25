import { EntityType, DEFAULT_COLLISION_MASK, CollisionBit, HitboxCollisionType, createCircularBox } from "webgl-test-shared";
import { createAIHelperComponentData } from "../entity-components/server-components/AIHelperComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createTribeMemberComponentData } from "../entity-components/server-components/TribeMemberComponent";
import { createTribesmanAIComponentData } from "../entity-components/server-components/TribesmanAIComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createCogwalkerConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, createCircularBox(x, y, 0, 0, angle, 28), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK
);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.cogwalker,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createTribeComponentData(tribe),
         createTribeMemberComponentData(),
         createTribesmanAIComponentData(),
         createAIHelperComponentData()
      ],
      clientComponentData: []
   };
}