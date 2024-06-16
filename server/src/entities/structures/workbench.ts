import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { CraftingStationComponent, CraftingStationComponentArray } from "../../components/CraftingStationComponent";
import { CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { Hitbox, RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

export const HITBOX_SIZE = 80;

export function createWorbenchHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.6, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createWorkbench(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const workbench = new Entity(position, rotation, EntityType.workbench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWorbenchHitboxes(workbench.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      workbench.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(workbench.id, new HealthComponent(15));
   StatusEffectComponentArray.addComponent(workbench.id, new StatusEffectComponent(0));
   StructureComponentArray.addComponent(workbench.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(workbench.id, new TribeComponent(tribe));
   CraftingStationComponentArray.addComponent(workbench.id, new CraftingStationComponent(CraftingStation.workbench));

   return workbench;
}