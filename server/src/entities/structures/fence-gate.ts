import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { FenceGateComponent, FenceGateComponentArray } from "../../components/FenceGateComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createFenceGateHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createFenceGate(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const fenceGate = new Entity(position, rotation, EntityType.fenceGate, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFenceGateHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      fenceGate.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(fenceGate.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(fenceGate.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(fenceGate.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(fenceGate.id, new TribeComponent(tribe));
   FenceGateComponentArray.addComponent(fenceGate.id, new FenceGateComponent());
   
   return fenceGate;
}