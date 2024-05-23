import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { PlanterBoxComponent, PlanterBoxComponentArray } from "../../components/PlanterBoxComponent";
import { StructureComponent, StructureComponentArray } from "../../components/StructureComponent";
import { StructureConnectionInfo } from "webgl-test-shared/dist/structures";
import { Hitbox } from "../../hitboxes/hitboxes";

const HITBOX_SIZE = 80 - 0.05;

export function createPlanterBoxHitboxes(parentPosition: Point, localID: number, parentRotation: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(parentPosition, 1.5, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK));
   return hitboxes;
}

export function createPlanterBox(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const planterBox = new Entity(position, rotation, EntityType.planterBox, COLLISION_BITS.planterBox, DEFAULT_COLLISION_MASK);

   const hitboxes = createPlanterBoxHitboxes(position, planterBox.getNextHitboxLocalID(), rotation);
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