import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
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
import { createWorkbenchHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createWorkbench(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const workbench = new Entity(position, rotation, EntityType.workbench, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWorkbenchHitboxes(workbench.getNextHitboxLocalID());
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