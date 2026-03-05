import { Point, EntityType, ServerComponentType, DEFAULT_COLLISION_MASK, CollisionBit, RectangularBox, HitboxCollisionType } from "webgl-test-shared";
import { createAIHelperComponentData } from "../entity-components/server-components/AIHelperComponent";
import { createAmmoBoxComponentData } from "../entity-components/server-components/AmmoBoxComponent";
import { createBallistaComponentData } from "../entity-components/server-components/BallistaComponent";
import { createHealthComponentData } from "../entity-components/server-components/HealthComponent";
import { createInventoryComponentData } from "../entity-components/server-components/InventoryComponent";
import { createStatusEffectComponentData } from "../entity-components/server-components/StatusEffectComponent";
import { createStructureComponentData } from "../entity-components/server-components/StructureComponent";
import { createTransformComponentData } from "../entity-components/server-components/TransformComponent";
import { createTribeComponentData } from "../entity-components/server-components/TribeComponent";
import { createTurretComponentData } from "../entity-components/server-components/TurretComponent";
import { Hitbox, createHitboxQuick } from "../hitboxes";
import { Tribe } from "../tribes";
import { EntityComponentData } from "../world";
import { EntityServerComponentData } from "../networking/packet-snapshots";

export function createBallistaConfig(position: Point, rotation: number, tribe: Tribe): EntityComponentData {
   const hitboxes = new Array<Hitbox>();
   let hitboxLocalID = 0;

   const box = new RectangularBox(position, new Point(0, 0), rotation, 100, 100);
   const hitbox = createHitboxQuick(0, hitboxLocalID++, null, box, 2, HitboxCollisionType.hard, CollisionBit.default, DEFAULT_COLLISION_MASK, []);
   hitboxes.push(hitbox);

   return {
      entityType: EntityType.ballista,
      serverComponentData: new Map([
         [ServerComponentType.transform, createTransformComponentData(hitboxes)],
         [ServerComponentType.health, createHealthComponentData()],
         [ServerComponentType.statusEffect, createStatusEffectComponentData()],
         [ServerComponentType.structure, createStructureComponentData()],
         [ServerComponentType.tribe, createTribeComponentData(tribe)],
         [ServerComponentType.turret, createTurretComponentData()],
         [ServerComponentType.aiHelper, createAIHelperComponentData()],
         [ServerComponentType.ammoBox, createAmmoBoxComponentData()],
         [ServerComponentType.inventory, createInventoryComponentData({})],
         [ServerComponentType.ballista, createBallistaComponentData()]
      ]) as EntityServerComponentData,
      clientComponentData: new Map()
   };
}