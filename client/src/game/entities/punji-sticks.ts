import { EntityType, DEFAULT_COLLISION_MASK, CollisionBit, HitboxCollisionType, createRectangularBox } from "webgl-test-shared";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createPunjiSticksComponentData } from "../entity-components/server-components/PunjiSticksComponent";
import { createSpikesComponentData } from "../entity-components/server-components/SpikesComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox, setHitboxIsNonGrassBlocking } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createFloorPunjiSticksConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 48, 48);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsNonGrassBlocking(hitbox);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.floorPunjiSticks,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createSpikesComponentData(),
         createPunjiSticksComponentData()
      ],
      clientComponentData: []
   };
}

export function createWallPunjiSticksConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 56, 32);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsNonGrassBlocking(hitbox);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.wallPunjiSticks,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createSpikesComponentData(),
         createPunjiSticksComponentData()
      ],
      clientComponentData: []
   };
}