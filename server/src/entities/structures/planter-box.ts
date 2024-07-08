import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponent, HealthComponentArray } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import Tribe from "../../Tribe";
import { TribeComponent, TribeComponentArray } from "../../components/TribeComponent";
import { PlanterBoxComponent, PlanterBoxComponentArray } from "../../components/PlanterBoxComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { createPlanterBoxHitboxes } from "webgl-test-shared/dist/hitboxes/entity-hitbox-creation";

export function createPlanterBox(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const planterBox = new Entity(position, rotation, EntityType.planterBox, COLLISION_BITS.planterBox, DEFAULT_COLLISION_MASK);

   const hitboxes = createPlanterBoxHitboxes();
   for (let i = 0; i < hitboxes.length; i++) {
      planterBox.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(planterBox.id, new HealthComponent(15));
   StatusEffectComponentArray.addComponent(planterBox.id, new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding));
   TribeComponentArray.addComponent(planterBox.id, new TribeComponent(tribe));
   StructureComponentArray.addComponent(planterBox.id, new StructureComponent(connectionInfo));
   PlanterBoxComponentArray.addComponent(planterBox.id, new PlanterBoxComponent());
   
   return planterBox;
}