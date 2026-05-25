import { Settings, CollisionBit, DEFAULT_COLLISION_MASK, HitboxCollisionType, EntityType, BuildingMaterial, createRectangularBox } from "webgl-test-shared";
import { createBracingsComponentData } from "../entity-components/server-components/BracingsComponent";
import { createBuildingMaterialComponentData } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";
import { createHitboxQuick, Hitbox } from "../hitboxes";

export function createBracingsConfig(x: number, y: number, angle: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;
   
   const hitbox1 = createHitboxQuick(0, hitboxLocalID++, null, createRectangularBox(x, y, 0, Settings.TILE_SIZE * -0.5, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK)
   hitboxes.push(hitbox1);

   const hitbox2 = createHitboxQuick(0, hitboxLocalID++, null, createRectangularBox(x, y, 0, Settings.TILE_SIZE * 0.5, angle, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK)
   hitboxes.push(hitbox2);
   
   return {
      entityType: EntityType.bracings,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createBuildingMaterialComponentData(material),
         createBracingsComponentData()
      ],
      clientComponentData: []
   };
}