import { Entity } from "webgl-test-shared";
import { AIPlan, TribeAssignmentInfo } from "../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { ExtendedTribe } from "../game/tribes";
import { entityExists } from "../game/world";

let tribeAssignmentInfo = $state<TribeAssignmentInfo | null>(null);
let tribe = $state<ExtendedTribe | null>(null);

let entity = $state<Entity>(0);

export const tribePlanVisualiserState = {
   get tribeAssignmentInfo() {
      return tribeAssignmentInfo;
   },
   setTribeAssignmentInfo(newTribeAssignmentInfo: TribeAssignmentInfo | null): void {
      tribeAssignmentInfo = newTribeAssignmentInfo;
   },

   get tribe() {
      return tribe;
   },
   setTribe(newTribe: ExtendedTribe | null): void {
      tribe = newTribe;
   },

   get entity(): Entity | null {
      return entityExists(entity) ? entity : null;
   },
   setEntity(newEntity: Entity | null): void {
      entity = newEntity !== null ? entity : 0;
   }
};

export function getPlanX(plan: AIPlan, offsetX: number): number {
   return plan.xOffset * 1.7 + offsetX;
}
export function getPlanY(plan: AIPlan, offsetY: number): number {
   return plan.depth * 160 + offsetY;
}