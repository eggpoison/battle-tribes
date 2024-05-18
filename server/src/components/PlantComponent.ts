import { PlanterBoxPlant, PlantComponentData } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import Entity from "../Entity";
import { PlantComponentArray } from "./ComponentArray";

export const PLANT_GROWTH_TICKS: Record<PlanterBoxPlant, number> = {
   // @Temporary
   // [PlanterBoxPlant.tree]: 90 * Settings.TPS,
   [PlanterBoxPlant.tree]: 50 * Settings.TPS,
   // @Temporary
   // [PlanterBoxPlant.berryBush]: 60 * Settings.TPS,
   [PlanterBoxPlant.berryBush]: 10 * Settings.TPS,
   // [PlanterBoxPlant.iceSpikes]: 120 * Settings.TPS
   [PlanterBoxPlant.iceSpikes]: 12 * Settings.TPS
};

export class PlantComponent {
   public readonly planterBoxI
   : number;

   public readonly plantType: PlanterBoxPlant;
   public plantGrowthTicks = 0;

   public numFruit = 0;
   public fruitRandomGrowthTicks = 0;

   constructor(planterBoxID: number, plant: PlanterBoxPlant) {
      this.planterBoxID = planterBoxID;
      this.plantType = plant;
   }
}

const plantCanGrowFruit = (plantComponent: PlantComponent): boolean => {
   if (plantComponent.plantType !== PlanterBoxPlant.berryBush) {
      return false;
   }
   
   return plantComponent.numFruit < 4;
}

export function tickPlantComponent(plantComponent: PlantComponent): void {
   if (plantComponent.plantType === null) {
      return;
   }

   const ticksToGrow = PLANT_GROWTH_TICKS[plantComponent.plantType];
   if (plantComponent.plantGrowthTicks < ticksToGrow) {
      plantComponent.plantGrowthTicks++;
   } else if (plantCanGrowFruit(plantComponent)) {
      // Grow fruit
      if (Math.random() < 0.3 / Settings.TPS) {
         plantComponent.fruitRandomGrowthTicks++;
         if (plantComponent.fruitRandomGrowthTicks === 5) {
            plantComponent.numFruit++;
            plantComponent.fruitRandomGrowthTicks = 0;
         }
      }
   }
}

export function plantIsFullyGrown(plantComponent: PlantComponent): boolean {
   const ticksToGrow = PLANT_GROWTH_TICKS[plantComponent.plantType];
   return plantComponent.plantGrowthTicks === ticksToGrow;
}

export function serialisePlantComponent(entity: Entity): PlantComponentData {
   const plantComponent = PlantComponentArray.getComponent(entity.id);

   let growthProgress: number;
   if (plantComponent.plantType !== null) {
      growthProgress = plantComponent.plantGrowthTicks / PLANT_GROWTH_TICKS[plantComponent.plantType];
   } else {
      growthProgress = 0;
   }
   
   return {
      plant: plantComponent.plantType,
      plantGrowthProgress: growthProgress,
      numFruit: plantComponent.numFruit
   };
}