import { Point, EntityType, BuildingMaterial, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType, HitboxFlag } from "webgl-test-shared";
import { createBuildingMaterialComponentData } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createSpikesComponentData } from "../entity-components/server-components/SpikesComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createFloorSpikesConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 48, 48);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.floorSpikes,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createBuildingMaterialComponentData(material),
         createSpikesComponentData()
      ],
      clientComponentData: []
   };
}

export function createWallSpikesConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 56, 28);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [HitboxFlag.NON_GRASS_BLOCKING]);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.wallSpikes,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createBuildingMaterialComponentData(material),
         createSpikesComponentData()
      ],
      clientComponentData: []
   };
}