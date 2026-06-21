import { createCircularBox, HitboxCollisionType } from "../../../../shared/src/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { ServerComponentType } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { createAIHelperComponentData } from "../entity-components/server-components/AIHelperComponent";
import { createHealingTotemComponentData } from "../entity-components/server-components/HealingTotemComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createHealingTotemConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Hitbox[] = [];
   let hitboxLocalID = 0;

   const box = createCircularBox(x, y, 0, 0, angle, 48);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.healingTotem,
      serverComponentData: [
         [ServerComponentType.transform, createTransformComponentData(hitboxes)],
         [ServerComponentType.health, createHealthComponentData()],
         [ServerComponentType.statusEffect, createStatusEffectComponentData()],
         [ServerComponentType.structure, createStructureComponentData()],
         [ServerComponentType.tribe, createTribeComponentData(tribe)],
         [ServerComponentType.aiHelper, createAIHelperComponentData()],
         [ServerComponentType.healingTotem, createHealingTotemComponentData()]
      ],
      clientComponentData: []
   };
}