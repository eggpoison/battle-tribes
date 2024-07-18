import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import Board from "../Board";
import { PlantComponentArray } from "./PlantComponent";
import { Settings } from "webgl-test-shared/dist/settings";
import { EntityID } from "webgl-test-shared/dist/entities";
import { TransformComponentArray } from "./TransformComponent";
import { createPlantConfig } from "../entities/plant";
import { createEntityFromConfig } from "../Entity";
import { Packet } from "webgl-test-shared/dist/packets";

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

export const PlanterBoxComponentArray = new ComponentArray<PlanterBoxComponent>(ServerComponentType.planterBox, true, {
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToComponent
});

function onRemove(entity: EntityID): void {
   // When a planter box is destroyed, destroy the plant that was in it
   
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);

   const plant = planterBoxComponent.plantEntity;
   if (Board.hasEntity(plant)) {
      Board.destroyEntity(plant);
   }
}

export function tickPlanterBoxComponent(planterBoxComponent: PlanterBoxComponent): void {
   if (planterBoxComponent.remainingFertiliserTicks > 0) {
      planterBoxComponent.remainingFertiliserTicks--;
   }
}

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToComponent(packet: Packet, entity: EntityID): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   let plantType = -1;
   if (planterBoxComponent.plantEntity !== null) {
      const plant = planterBoxComponent.plantEntity;
      if (Board.hasEntity(plant)) {
         const plantComponent = PlantComponentArray.getComponent(plant);
         plantType = plantComponent.plantType;
      }
   }

   packet.addNumber(plantType);
   packet.addBoolean(planterBoxComponent.remainingFertiliserTicks > 0);
   packet.padOffset(3);
}

export function placePlantInPlanterBox(planterBox: EntityID, plantType: PlanterBoxPlant): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox);
   const transformComponent = TransformComponentArray.getComponent(planterBox);

   // Create plant
   const config = createPlantConfig();
   config[ServerComponentType.transform].position.x = transformComponent.position.x;
   config[ServerComponentType.transform].position.y = transformComponent.position.y;
   config[ServerComponentType.transform].rotation = 2 * Math.PI * Math.random();
   config[ServerComponentType.plant].plantType = plantType;
   config[ServerComponentType.plant].planterBox = planterBox;
   const plant = createEntityFromConfig(config);

   planterBoxComponent.plantEntity = plant;
   planterBoxComponent.replantType = plantType;
}

export function fertilisePlanterBox(planterBoxComponent: PlanterBoxComponent): void {
   planterBoxComponent.remainingFertiliserTicks = Vars.FERTILISER_DURATION_TICKS;
}