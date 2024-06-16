import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import Tribe from "../../Tribe";
import { FenceComponent, FenceComponentArray } from "../../components/FenceComponent";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponentArray, StatusEffectComponent } from "../../components/StatusEffectComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { CraftingStation } from "webgl-test-shared/dist/crafting-recipes";
import { CraftingStationComponentArray, CraftingStationComponent } from "../../components/CraftingStationComponent";
import { createStonecarvingTableHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createStonecarvingTable(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const stonecarvingTable = new Entity(position, rotation, EntityType.stonecarvingTable, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createStonecarvingTableHitboxes(stonecarvingTable.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      stonecarvingTable.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(stonecarvingTable.id, new HealthComponent(40));
   StatusEffectComponentArray.addComponent(stonecarvingTable.id, new StatusEffectComponent(StatusEffect.freezing | StatusEffect.poisoned));
   StructureComponentArray.addComponent(stonecarvingTable.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(stonecarvingTable.id, new TribeComponent(tribe));
   FenceComponentArray.addComponent(stonecarvingTable.id, new FenceComponent());
   CraftingStationComponentArray.addComponent(stonecarvingTable.id, new CraftingStationComponent(CraftingStation.stonecarvingTable));
   
   return stonecarvingTable;
}