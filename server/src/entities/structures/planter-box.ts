import { COLLISION_BITS, DEFAULT_COLLISION_MASK, DEFAULT_HITBOX_COLLISION_MASK, HitboxCollisionBit } from "webgl-test-shared/dist/collision";
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
import { Hitbox, RectangularHitbox, HitboxCollisionType } from "webgl-test-shared/dist/hitboxes/hitboxes";

const HITBOX_SIZE = 80 - 0.05;

export function createPlanterBoxHitboxes(localID: number): ReadonlyArray<Hitbox> {
   const hitboxes = new Array<Hitbox>();
   hitboxes.push(new RectangularHitbox(1.5, new Point(0, 0), HitboxCollisionType.hard, HitboxCollisionBit.DEFAULT, DEFAULT_HITBOX_COLLISION_MASK, localID, 0, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createPlanterBox(position: Point, rotation: number, tribe: Tribe, connectionInfo: StructureConnectionInfo): Entity {
   const planterBox = new Entity(position, rotation, EntityType.planterBox, COLLISION_BITS.planterBox, DEFAULT_COLLISION_MASK);

   const hitboxes = createPlanterBoxHitboxes(planterBox.getNextHitboxLocalID());
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