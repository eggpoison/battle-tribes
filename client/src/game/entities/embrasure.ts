import { Point, EntityType, BuildingMaterial, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createBuildingMaterialComponentData } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";
import { EntityServerComponentData, EntityServerComponentDataEntries } from "../networking/packet-snapshots";

export function createEmbrasureConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;
   
   const VERTICAL_HITBOX_WIDTH = 12;
   const VERTICAL_HITBOX_HEIGHT = 20;
   
   const HORIZONTAL_HITBOX_WIDTH = 24;
   const HORIZONTAL_HITBOX_HEIGHT = 16;

   // Add the two vertical hitboxes (can stop arrows)
   const hitbox1 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-(64 - VERTICAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox1);
   const hitbox2 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point((64 - VERTICAL_HITBOX_WIDTH) / 2 - 0.025, 0), rotation, VERTICAL_HITBOX_WIDTH, VERTICAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox2);

   // Add the two horizontal hitboxes (cannot stop arrows)
   const hitbox3 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-(64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.arrowPassable, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox3);
   const hitbox4 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point((64 - HORIZONTAL_HITBOX_WIDTH) / 2 + 0.025, 0), rotation, HORIZONTAL_HITBOX_WIDTH, HORIZONTAL_HITBOX_HEIGHT), 0.4, HitboxCollisionType.hard, CollisionBit.arrowPassable, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox4);

   return {
      entityType: EntityType.embrasure,
      serverComponentData: new Map([
         [ServerComponentType.transform, createTransformComponentData(hitboxes)],
         [ServerComponentType.health, createHealthComponentData()],
         [ServerComponentType.statusEffect, createStatusEffectComponentData()],
         [ServerComponentType.structure, createStructureComponentData()],
         [ServerComponentType.tribe, createTribeComponentData(tribe)],
         [ServerComponentType.buildingMaterial, createBuildingMaterialComponentData(material)]
      // @HACK
      ] as EntityServerComponentDataEntries<ServerComponentType>) as EntityServerComponentData,
      clientComponentData: new Map()
   };
}