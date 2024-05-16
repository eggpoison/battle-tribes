import { PlanterBoxComponentData, PlanterBoxPlant } from "webgl-test-shared/dist/components";
import { PlantComponentArray, PlanterBoxComponentArray } from "./ComponentArray";
import Entity from "../Entity";
import { createPlant } from "../entities/plant";
import Board from "../Board";

export class PlanterBoxComponent {
   public plantEntityID = 0;

   /** Plant type that AI tribesman will attempt to place in the planter box */
   public replantType: PlanterBoxPlant | null = null;
}

export function serialisePlanterBoxComponent(entityID: number): PlanterBoxComponentData {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entityID);
   
   let plantType: PlanterBoxPlant | null = null;
   if (planterBoxComponent.plantEntityID !== null) {
      const plant = Board.entityRecord[planterBoxComponent.plantEntityID];
      if (typeof plant !== "undefined") {
         const plantComponent = PlantComponentArray.getComponent(plant.id);
         plantType = plantComponent.plantType;
      }
   }
   
   return {
      plantType: plantType
   };
}

export function placePlantInPlanterBox(planterBox: Entity, plantType: PlanterBoxPlant): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox.id);

   const plantEntity = createPlant(planterBox.position.copy(), 2 * Math.PI * Math.random(), planterBox.id, plantType);
   planterBoxComponent.plantEntityID = plantEntity.id;
   planterBoxComponent.replantType = plantType;
}