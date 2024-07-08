import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import { createWarriorHutHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import { HutComponent, HutComponentArray } from "../../components/HutComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";

export function createWarriorHut(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const hut = new Entity(position, rotation, EntityType.warriorHut, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createWarriorHutHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      hut.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(hut.id, new HealthComponent(75));
   StatusEffectComponentArray.addComponent(hut.id, new StatusEffectComponent(StatusEffect.poisoned));
   StructureComponentArray.addComponent(hut.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(hut.id, new TribeComponent(tribe));
   HutComponentArray.addComponent(hut.id, new HutComponent());

   return hut;
}