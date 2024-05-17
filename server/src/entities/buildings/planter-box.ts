import { HitboxCollisionType } from "webgl-test-shared/dist/client-server-types";
import { COLLISION_BITS, DEFAULT_COLLISION_MASK } from "webgl-test-shared/dist/collision";
import { EntityType } from "webgl-test-shared/dist/entities";
import { StatusEffect } from "webgl-test-shared/dist/status-effects";
import { Point } from "webgl-test-shared/dist/utils";
import Entity from "../../Entity";
import { HealthComponentArray, PlanterBoxComponentArray, TribeComponentArray } from "../../components/ComponentArray";
import { HealthComponent } from "../../components/HealthComponent";
import { StatusEffectComponent, StatusEffectComponentArray } from "../../components/StatusEffectComponent";
import RectangularHitbox from "../../hitboxes/RectangularHitbox";
import Tribe from "../../Tribe";
import { TribeComponent } from "../../components/TribeComponent";
import { PlanterBoxComponent } from "../../components/PlanterBoxComponent";
import CircularHitbox from "../../hitboxes/CircularHitbox";
import Board from "../../Board";

const HITBOX_SIZE = 80 - 0.05;

export function createPlanterBoxHitboxes(parentX: number, parentY: number, localID: number, parentRotation: number): ReadonlyArray<RectangularHitbox | CircularHitbox> {
   const hitboxes = new Array<RectangularHitbox | CircularHitbox>();
   hitboxes.push(new RectangularHitbox(parentX, parentY, 1.5, 0, 0, HitboxCollisionType.hard, localID, parentRotation, HITBOX_SIZE, HITBOX_SIZE, 0));
   return hitboxes;
}

export function createPlanterBox(position: Point, rotation: number, tribe: Tribe): Entity {
   const planterBox = new Entity(position, rotation, EntityType.planterBox, COLLISION_BITS.planterBox, DEFAULT_COLLISION_MASK);

   const hitboxes = createPlanterBoxHitboxes(position.x, position.y, planterBox.getNextHitboxLocalID(), rotation);
   for (let i = 0; i < hitboxes.length; i++) {
      planterBox.addHitbox(hitboxes[i]);
   }

   HealthComponentArray.addComponent(planterBox.id, new HealthComponent(15));
   StatusEffectComponentArray.addComponent(planterBox.id, new StatusEffectComponent(StatusEffect.poisoned | StatusEffect.bleeding));
   TribeComponentArray.addComponent(planterBox.id, new TribeComponent(tribe));
   PlanterBoxComponentArray.addComponent(planterBox.id, new PlanterBoxComponent());
   
   return planterBox;
}

export function onPlanterBoxRemove(planterBox: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox.id);

   const plant = Board.entityRecord[planterBoxComponent.plantEntityID];
   if (typeof plant !== "undefined") {
      plant.destroy();
   }
}