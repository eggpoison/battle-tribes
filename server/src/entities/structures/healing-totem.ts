import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Tribe from "../../Tribe";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponentArray, StatusEffectComponent } from "../../components/StatusEffectComponent";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { HealingTotemComponent, HealingTotemComponentArray } from "../../components/HealingTotemComponent";
import { StructureComponentArray, StructureComponent } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createHealingTotemHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createHealingTotem(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const healingTotem = new Entity(position, rotation, EntityType.healingTotem, COLLISION_BITS.default, DEFAULT_COLLISION_MASK);

   const hitboxes = createHealingTotemHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      healingTotem.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(healingTotem.id, new HealthComponent(50));
   StatusEffectComponentArray.addComponent(healingTotem.id, new StatusEffectComponent(StatusEffect.bleeding));
   StructureComponentArray.addComponent(healingTotem.id, new StructureComponent(connectionInfo));
   TribeComponentArray.addComponent(healingTotem.id, new TribeComponent(tribe));
   HealingTotemComponentArray.addComponent(healingTotem.id, new HealingTotemComponent());
   
   return healingTotem;
}