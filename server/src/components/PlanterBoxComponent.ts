import { PlanterBoxComponentData, PlanterBoxPlant } from "webgl-test-shared/dist/components";
import { PlantComponentArray, PlanterBoxComponentArray } from "./ComponentArray";
import Entity from "../Entity";
import { createPlant } from "../entities/plant";
import Board from "../Board";

export class PlanterBoxComponent {
   public plantEntityID = 0;
}

export function serialisePlanterBoxComponent(entityID: number): PlanterBoxComponentData {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entityID);
   
   let plantType: PlanterBoxPlant | null;
   if (planterBoxComponent.plantEntityID !== null) {
      const plant = Board.entityRecord[planterBoxComponent.plantEntityID];
      if (typeof plant !== "undefined") {
         const plantComponent = PlantComponentArray.getComponent(plant.id);
         plantType = plantComponent.plantType;
      } else {
         plantType = null;
      }
   } else {
      plantType = null;
   }
   
   return {
      plantType: plantType
   };
}

export function placePlantInPlanterBox(planterBox: Entity, plant: PlanterBoxPlant): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox.id);
   if (planterBoxComponent.plantEntityID !== 0) {
      return;
   }

   const plantEntity = createPlant(planterBox.position.copy(), 2 * Math.PI * Math.random(), planterBox.id, plant);
   planterBoxComponent.plantEntityID = plantEntity.id;
}