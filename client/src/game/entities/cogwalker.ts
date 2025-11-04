import { HitboxCollisionType } from "../../../../shared/src/boxes/boxes";
import CircularBox from "../../../../shared/src/boxes/CircularBox";
import { DEFAULT_COLLISION_MASK, CollisionBit } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { Point } from "../../../../shared/src/utils";
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

export function createCogwalkerConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, new CircularBox(position, new Point(0, 0), rotation, 28), 1.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.cogwalker,
      serverComponentData: {
         [ServerComponentType.transform]: createTransformComponentData(hitboxes),
         [ServerComponentType.health]: createHealthComponentData(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentData(),
         [ServerComponentType.tribe]: createTribeComponentData(tribe),
         [ServerComponentType.tribeMember]: createTribeMemberComponentData(),
         [ServerComponentType.tribesmanAI]: createTribesmanAIComponentData(),
         [ServerComponentType.aiHelper]: createAIHelperComponentData(),
      },
      clientComponentData: {}
   };
}