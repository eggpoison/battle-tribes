import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { entityExists } from "../world";
import { ComponentArray } from "./ComponentArray";
import { PlanterBoxComponentArray } from "./PlanterBoxComponent";

export class PlantedComponent {
   public readonly planterBox: Entity;

   constructor(planterBox: Entity) {
      this.planterBox = planterBox;
   }
}

export const PlantedComponentArray = new ComponentArray<PlantedComponent>(ServerComponentType.planted, true, getDataLength, addDataToPacket);
PlantedComponentArray.onRemove = onRemove;

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}

function onRemove(entity: Entity): void {
   const plantedComponent = PlantedComponentArray.getComponent(entity);
   
   // Register in the planter box that the plant has been removed
   if (entityExists(plantedComponent.planterBox)) {
      const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantedComponent.planterBox);
      planterBoxComponent.plant = null;
   }
}