import { PlanterBoxPlant, PlantComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { PlanterBoxComponentArray } from "./PlanterBoxComponent";

export const PLANT_GROWTH_TICKS: Record<PlanterBoxPlant, number> = {
   // @Temporary
   [PlanterBoxPlant.tree]: 90 * Settings.TPS,
   // [PlanterBoxPlant.tree]: 50 * Settings.TPS,
   // @Temporary
   [PlanterBoxPlant.berryBush]: 60 * Settings.TPS,
   // [PlanterBoxPlant.berryBush]: 10 * Settings.TPS,
   [PlanterBoxPlant.iceSpikes]: 120 * Settings.TPS
   // [PlanterBoxPlant.iceSpikes]: 12 * Settings.TPS
};

export class PlantComponent {
   public readonly planterBoxID: number;

   public readonly plantType: PlanterBoxPlant;
   public plantGrowthTicks = 0;

   public numFruit = 0;
   public fruitRandomGrowthTicks = 0;

   constructor(planterBoxID: number, plant: PlanterBoxPlant) {
      this.planterBoxID = planterBoxID;
      this.plantType = plant;
   }
}

export const PlantComponentArray = new ComponentArray<ServerComponentType.plant, PlantComponent>(true, {
   onRemove: onRemove,
   serialise: serialise
});

function onRemove(entityID: number): void {
   // Register in the planter box that the plant has been removed
   const plantComponent = PlantComponentArray.getComponent(entityID);

   const planterBoxID = plantComponent.planterBoxID;
   if (PlanterBoxComponentArray.hasComponent(planterBoxID)) {
      const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBoxID);
      planterBoxComponent.plantEntityID = 0;
   }
}

const plantCanGrowFruit = (plantComponent: PlantComponent): boolean => {
   if (plantComponent.plantType !== PlanterBoxPlant.berryBush) {
      return false;
   }
   
   return plantComponent.numFruit < 4;
}

const plantIsFertilised = (plantComponent: PlantComponent): boolean => {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantComponent.planterBoxID);
   return planterBoxComponent.remainingFertiliserTicks > 0;
}

export function tickPlantComponent(plantComponent: PlantComponent): void {
   if (plantComponent.plantType === null) {
      return;
   }

   const isFertilised = plantIsFertilised(plantComponent);

   const ticksToGrow = PLANT_GROWTH_TICKS[plantComponent.plantType];
   plantComponent.plantGrowthTicks += isFertilised ? 1.5 : 1;
   if (plantComponent.plantGrowthTicks >= ticksToGrow) {
      plantComponent.plantGrowthTicks = ticksToGrow;
      
      if (plantCanGrowFruit(plantComponent)) {
         const tickChance = isFertilised ? 0.45 : 0.3;
         
         // Grow fruit
         if (Math.random() < tickChance / Settings.TPS) {
            plantComponent.fruitRandomGrowthTicks++;
            if (plantComponent.fruitRandomGrowthTicks === 5) {
               plantComponent.numFruit++;
               plantComponent.fruitRandomGrowthTicks = 0;
            }
         }
      }
   }
}

export function plantIsFullyGrown(plantComponent: PlantComponent): boolean {
   const ticksToGrow = PLANT_GROWTH_TICKS[plantComponent.plantType];
   return plantComponent.plantGrowthTicks === ticksToGrow;
}

function serialise(entityID: number): PlantComponentData {
   const plantComponent = PlantComponentArray.getComponent(entityID);

   let growthProgress: number;
   if (plantComponent.plantType !== null) {
      growthProgress = plantComponent.plantGrowthTicks / PLANT_GROWTH_TICKS[plantComponent.plantType];
   } else {
      growthProgress = 0;
   }
   
   return {
      componentType: ServerComponentType.plant,
      plant: plantComponent.plantType,
      plantGrowthProgress: growthProgress,
      numFruit: plantComponent.numFruit
   };
}