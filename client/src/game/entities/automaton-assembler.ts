import { Point, EntityType, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType, HitboxFlag } from "webgl-test-shared";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { createAutomatonAssemblerComponentData } from "../entity-components/server-components/AutomatonAssemblerComponent";
import { createCraftingStationComponentData } from "../entity-components/server-components/CraftingStationComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";
import { EntityServerComponentData } from "../networking/packet-snapshots";

export function createAutomatonAssemblerConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 160, 80);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.automatonAssembler,
      serverComponentData: new Map([
         [ServerComponentType.transform, createTransformComponentData(hitboxes)],
         [ServerComponentType.health, createHealthComponentData()],
         [ServerComponentType.statusEffect, createStatusEffectComponentData()],
         [ServerComponentType.structure, createStructureComponentData()],
         [ServerComponentType.tribe, createTribeComponentData(tribe)],
         [ServerComponentType.craftingStation, createCraftingStationComponentData()],
         [ServerComponentType.automatonAssembler, createAutomatonAssemblerComponentData()],
      ]) as EntityServerComponentData,
      clientComponentData: new Map()
   };
}