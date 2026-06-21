import { createRectangularBox, HitboxCollisionType } from "../../../../shared/src/boxes";
import { CollisionBit, DEFAULT_COLLISION_MASK } from "../../../../shared/src/collision";
import { BuildingMaterial } from "../../../../shared/src/components";
import { EntityType } from "../../../../shared/src/entities";
import { createBuildingMaterialComponentData } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createSpikesComponentData } from "../entity-components/server-components/SpikesComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox, setHitboxIsNonGrassBlocking } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createFloorSpikesConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Hitbox[] = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 48, 48);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsNonGrassBlocking(hitbox);
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

export function createWallSpikesConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Hitbox[] = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 56, 28);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK);
   setHitboxIsNonGrassBlocking(hitbox);
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