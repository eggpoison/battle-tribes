import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { FenceComponent, FenceComponentArray } from "../../components/FenceComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createFenceHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createFence(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const fence = new Entity(position, rotation, EntityType.fence, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createFenceHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      fence.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(fence.id, new HealthComponent(5));
   StatusEffectComponentArray.addComponent(fence.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(fence.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(fence.id, new TribeComponent(tribe));
   FenceComponentArray.addComponent(fence.id, new FenceComponent());
   
   return fence;
}