import { createRectangularBox, HitboxCollisionType } from "../../../../shared/src/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { EntityType } from "../../../../shared/src/entities";
import { createHitboxQuick, Hitbox, setHitboxIsNonGrassBlocking } from "../hitboxes";
import { createCraftingStationComponentData } from "../entity-components/server-components/CraftingStationComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createMithrilAnvilComponentData } from "../entity-components/server-components/MithrilAnvilComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createMithrilAnvilConfig(x: number, y: number, angle: number, tribe: Tribe): EntityComponentData {
   const hitboxes: Hitbox[] = [];
   let hitboxLocalID = 0;

   // Middle box
   {
      const box = createRectangularBox(x, y, -16, 0, angle, 48, 56);
      const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxIsNonGrassBlocking(hitbox);
      hitboxes.push(hitbox);
   }

   // Left box
   {
      const box = createRectangularBox(x, y, -48, 0, angle, 16, 40);
      const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxIsNonGrassBlocking(hitbox);
      hitboxes.push(hitbox);
   }

   // Right box
   {
      const box = createRectangularBox(x, y, 30, 0, angle, 44, 40);
      const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
      setHitboxIsNonGrassBlocking(hitbox);
      hitboxes.push(hitbox);
   }
   
   return {
      entityType: EntityType.mithrilAnvil,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createCraftingStationComponentData(),
         createMithrilAnvilComponentData()
      ],
      clientComponentData: []
   };
}