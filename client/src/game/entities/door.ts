import { EntityType, BuildingMaterial, DEFAULT_COLLISION_MASK, CollisionBit, HitboxCollisionType, createRectangularBox } from "webgl-test-shared";
import { createBuildingMaterialComponentData } from "../entity-components/server-components/BuildingMaterialComponent";
import { createDoorComponentData } from "../entity-components/server-components/DoorComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createDoorConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const box = createRectangularBox(x, y, 0, 0, angle, 64, 16);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 0.5, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.door,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createBuildingMaterialComponentData(material),
         createDoorComponentData()
      ],
      clientComponentData: []
   };
}