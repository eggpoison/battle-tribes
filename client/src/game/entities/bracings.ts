import { Settings, CollisionBit, DEFAULT_COLLISION_MASK, HitboxCollisionType, RectangularBox, Point, EntityType, BuildingMaterial, ServerComponentType } from "webgl-test-shared";
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

export function createBracingsConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;
   
   const hitbox1 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, Settings.TILE_SIZE * -0.5), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   hitboxes.push(hitbox1);

   const hitbox2 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(0, Settings.TILE_SIZE * 0.5), rotation, 16, 16), 0.2, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, [])
   hitboxes.push(hitbox2);
   
   return {
      entityType: EntityType.bracings,
      serverComponentData: {
         [ServerComponentType.transform]: createTransformComponentData(hitboxes),
         [ServerComponentType.health]: createHealthComponentData(),
         [ServerComponentType.statusEffect]: createStatusEffectComponentData(),
         [ServerComponentType.structure]: createStructureComponentData(),
         [ServerComponentType.tribe]: createTribeComponentData(tribe),
         [ServerComponentType.buildingMaterial]: createBuildingMaterialComponentData(material),
         [ServerComponentType.bracings]: createBracingsComponentData()
      },
      clientComponentData: {}
   };
}