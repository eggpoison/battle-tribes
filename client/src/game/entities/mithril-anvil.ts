import { Point, EntityType, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType, HitboxFlag } from "webgl-test-shared";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { createCraftingStationComponentData } from "../entity-components/server-components/CraftingStationComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createMithrilAnvilComponentData } from "../entity-components/server-components/MithrilAnvilComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";
import { EntityServerComponentData, EntityServerComponentDataEntries } from "../networking/packet-snapshots";

export function createMithrilAnvilConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   // Middle box
   {
      const box = new RectangularBox(position, new Point(-16, 0), rotation, 48, 56);
      const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
      hitboxes.push(hitbox);
   }

   // Left box
   {
      const box = new RectangularBox(position, new Point(-48, 0), rotation, 16, 40);
      const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
      hitboxes.push(hitbox);
   }

   // Right box
   {
      const box = new RectangularBox(position, new Point(30, 0), rotation, 44, 40);
      const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
      hitboxes.push(hitbox);
   }
   
   return {
      entityType: EntityType.mithrilAnvil,
      serverComponentData: new Map([
         [ServerComponentType.transform, createTransformComponentData(hitboxes)],
         [ServerComponentType.health, createHealthComponentData()],
         [ServerComponentType.statusEffect, createStatusEffectComponentData()],
         [ServerComponentType.structure, createStructureComponentData()],
         [ServerComponentType.tribe, createTribeComponentData(tribe)],
         [ServerComponentType.craftingStation, createCraftingStationComponentData()],
         [ServerComponentType.mithrilAnvil, createMithrilAnvilComponentData()]
      // @HACK
      ] as EntityServerComponentDataEntries<ServerComponentType>) as EntityServerComponentData,
      clientComponentData: new Map()
   };
}