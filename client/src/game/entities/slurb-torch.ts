import { createCircularBox, HitboxCollisionType } from "../../../../shared/src/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { EntityType } from "../../../../shared/src/entities";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createSlurbTorchComponentData } from "../entity-components/server-components/SlurbTorchComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createSlurbTorchConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Hitbox[] = [];
   let hitboxLocalID = 0;

   const box = createCircularBox(x, y, 0, 0, angle, 10);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0.55, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.slurbTorch,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createSlurbTorchComponentData()
      ],
      clientComponentData: []
   };
}