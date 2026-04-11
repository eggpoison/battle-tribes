import { Point, EntityType, DEFAULT_COLLISION_MASK, CollisionBit, CircularBox, HitboxCollisionType } from "webgl-test-shared";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createSlurbTorchComponentData } from "../entity-components/server-components/SlurbTorchComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createSlurbTorchConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = new CircularBox(position, new Point(0, 0), rotation, 10);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0.55, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
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