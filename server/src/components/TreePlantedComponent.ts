import { ServerComponentType, Entity, Packet, Settings } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { getPlantGrowthSpeed } from "./PlanterBoxComponent.js";

const enum Vars {
   GROWTH_TIME_TICKS = 90 * Settings.TICK_RATE
}

export class TreePlantedComponent {
   public plantGrowthTicks = 0;
}

export const TreePlantedComponentArray = new ComponentArray<TreePlantedComponent>(ServerComponentType.treePlanted, true, getDataLength, addDataToPacket);
TreePlantedComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};

export function plantedTreeIsFullyGrown(resource: Entity): boolean {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(resource);
   return treePlantedComponent.plantGrowthTicks === Vars.GROWTH_TIME_TICKS;
}

function onTick(entity: Entity): void {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);

   treePlantedComponent.plantGrowthTicks += getPlantGrowthSpeed(entity);
   if (treePlantedComponent.plantGrowthTicks > Vars.GROWTH_TIME_TICKS) {
      treePlantedComponent.plantGrowthTicks = Vars.GROWTH_TIME_TICKS;
   }
}

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const treePlantedComponent = TreePlantedComponentArray.getComponent(entity);

   const growthProgress = treePlantedComponent.plantGrowthTicks / Vars.GROWTH_TIME_TICKS;
   packet.writeNumber(growthProgress);
}