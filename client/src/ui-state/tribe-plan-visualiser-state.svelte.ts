import { AIPlan, TribeAssignmentInfo } from "../game/rendering/tribe-plan-visualiser/tribe-plan-visualiser";
import { ExtendedTribe } from "../game/tribes";

let tribeAssignmentInfo = $state<TribeAssignmentInfo | null>(null);
let tribe = $state<ExtendedTribe | null>(null);

export const tribePlanVisualiserState = {
   get tribeAssignmentInfo() {
      return tribeAssignmentInfo;
   },
   setTribeAssignmentInfo(newTribeAssignmentInfo: TribeAssignmentInfo | null): void {
      tribeAssignmentInfo = newTribeAssignmentInfo;
   },

   getTribe() {
      return tribe;
   },
   setTribe(newTribe: ExtendedTribe | null): void {
      tribe = newTribe;
   }
};

export function getPlanX(plan: AIPlan, offsetX: number): number {
   return plan.xOffset * 1.7 + offsetX;
}
export function getPlanY(plan: AIPlan, offsetY: number): number {
   return plan.depth * 160 + offsetY;
}