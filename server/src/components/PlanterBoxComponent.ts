import { PlanterBoxComponentData, PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import Entity from "../Entity";
import { createPlant } from "../entities/plant";
import Board from "../Board";
import { PlantComponentArray } from "./PlantComponent";
import { Settings } from "webgl-test-shared/dist/settings";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";

const enum Vars {
   FERTILISER_DURATION_TICKS = 300 * Settings.TPS
}

export interface PlanterBoxComponentParams {}

export class PlanterBoxComponent {
   public plantEntity: EntityID = 0;
   public remainingFertiliserTicks = 0;

   /** Plant type that AI tribesman will attempt to place in the planter box */
   public replantType: PlanterBoxPlant | null = null;
}

export const PlanterBoxComponentArray = new ComponentArray<ServerComponentType.planterBox, PlanterBoxComponent>(true, {
   onRemove: onRemove,
   serialise: serialise
});

function onRemove(entityID: number): void {
   // When a planter box is destroyed, destroy the plant that was in it
   
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entityID);

   const plant = Board.entityRecord[planterBoxComponent.plantEntity];
   if (typeof plant !== "undefined") {
      plant.destroy();
   }
}

export function tickPlanterBoxComponent(planterBoxComponent: PlanterBoxComponent): void {
   if (planterBoxComponent.remainingFertiliserTicks > 0) {
      planterBoxComponent.remainingFertiliserTicks--;
   }
}

function serialise(entityID: number): PlanterBoxComponentData {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entityID);
   
   let plantType: PlanterBoxPlant | null = null;
   if (planterBoxComponent.plantEntity !== null) {
      const plant = Board.entityRecord[planterBoxComponent.plantEntity];
      if (typeof plant !== "undefined") {
         const plantComponent = PlantComponentArray.getComponent(plant.id);
         plantType = plantComponent.plantType;
      }
   }
   
   return {
      componentType: ServerComponentType.planterBox,
      plantType: plantType,
      isFertilised: planterBoxComponent.remainingFertiliserTicks > 0
   };
}

export function placePlantInPlanterBox(planterBox: EntityID, plantType: PlanterBoxPlant): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox);
   const transformComponent = TransformComponentArray.getComponent(planterBox);

   const plantEntity = createPlant(transformComponent.position.copy(), 2 * Math.PI * Math.random(), planterBox, plantType);
   planterBoxComponent.plantEntity = plantEntity;
   planterBoxComponent.replantType = plantType;
}

export function fertilisePlanterBox(planterBoxComponent: PlanterBoxComponent): void {
   planterBoxComponent.remainingFertiliserTicks = Vars.FERTILISER_DURATION_TICKS;
}