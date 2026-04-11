import { Point, EntityType, BuildingMaterial, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createBuildingMaterialComponentData } from "../entity-components/server-components/BuildingMaterialComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createTunnelComponentData } from "../entity-components/server-components/TunnelComponent";
import { createHitboxQuick, Hitbox } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";

export function createTunnelConfig(position: Point, rotation: number, tribe: Tribe, material: BuildingMaterial): EntityComponentData {
   const hitboxes: Array<Hitbox> = [];
   let hitboxLocalID = 0;

   const HITBOX_WIDTH = 8;
   const HITBOX_HEIGHT = 64;
   const THIN_HITBOX_WIDTH = 0.1;
   
   // Soft hitboxes
   const soft1 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-32 + HITBOX_WIDTH / 2, 0), rotation, HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(soft1);
   const soft2 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(32 - HITBOX_WIDTH / 2, 0), rotation, HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.soft, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(soft2);

   // Hard hitboxes
   const hard1 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(-32.5 + THIN_HITBOX_WIDTH, 0), rotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hard1);
   const hard2 = createHitboxQuick(0, hitboxLocalID++, null, new RectangularBox(position.copy(), new Point(32.5 - THIN_HITBOX_WIDTH, 0), rotation, THIN_HITBOX_WIDTH, HITBOX_HEIGHT), 1, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hard2);

   const box = new RectangularBox(position, new Point(0, 0), rotation, 104, 104);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.tunnel,
      serverComponentData: [
         createTransformComponentData(hitboxes),
         createHealthComponentData(),
         createStatusEffectComponentData(),
         createStructureComponentData(),
         createTribeComponentData(tribe),
         createBuildingMaterialComponentData(material),
         createTunnelComponentData()
      ],
      clientComponentData: []
   };
}