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
import { createFrostshaperHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createFrostshaper(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const frostshaper = new Entity(position, rotation, EntityType.frostshaper, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFrostshaperHitboxes(frostshaper.getNextHitboxLocalID());
   for (let i = 0; i < hitboxes.length; i++) {
      frostshaper.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(frostshaper.id, new HealthComponent(20));
   StatusEffectComponentArray.addComponent(frostshaper.id, new StatusEffectComponent(StatusEffect.freezing | StatusEffect.poisoned));
   StructureComponentArray.addComponent(frostshaper.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(frostshaper.id, new TribeComponent(tribe));
   FenceComponentArray.addComponent(frostshaper.id, new FenceComponent());
   CraftingStationComponentArray.addComponent(frostshaper.id, new CraftingStationComponent(CraftingStation.frostshaper));
   
   return frostshaper;
}