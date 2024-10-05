import { PlanterBoxPlant, ServerComponentType } from "battletribes-shared/components";
import { Settings } from "battletribes-shared/settings";
import { ComponentArray } from "./ComponentArray";
import { PlanterBoxComponentArray } from "./PlanterBoxComponent";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

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
   public readonly planterBox: EntityID;

   public readonly plantType: PlanterBoxPlant;
   public plantGrowthTicks = 0;

   public numFruit = 0;
   public fruitRandomGrowthTicks = 0;

   constructor(plantType: PlanterBoxPlant, planterBox: EntityID) {
      this.plantType = plantType;
      this.planterBox = planterBox;
   }
}

export const PlantComponentArray = new ComponentArray<PlantComponent>(ServerComponentType.plant, true, {
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onRemove(entity: EntityID): void {
   // Register in the planter box that the plant has been removed
   const plantComponent = PlantComponentArray.getComponent(entity);

   const planterBoxID = plantComponent.planterBox;
   if (PlanterBoxComponentArray.hasComponent(planterBoxID)) {
      const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBoxID);
      planterBoxComponent.plantEntity = 0;
   }
}

const plantCanGrowFruit = (plantComponent: PlantComponent): boolean => {
   if (plantComponent.plantType !== PlanterBoxPlant.berryBush) {
      return false;
   }
   
   return plantComponent.numFruit < 4;
}

const plantIsFertilised = (plantComponent: PlantComponent): boolean => {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantComponent.planterBox);
   return planterBoxComponent.remainingFertiliserTicks > 0;
}

function onTick(plantComponent: PlantComponent): void {
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

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const plantComponent = PlantComponentArray.getComponent(entity);

   let growthProgress: number;
   if (plantComponent.plantType !== null) {
      growthProgress = plantComponent.plantGrowthTicks / PLANT_GROWTH_TICKS[plantComponent.plantType];
   } else {
      growthProgress = 0;
   }

   packet.addNumber(plantComponent.plantType);
   packet.addNumber(growthProgress);
   packet.addNumber(plantComponent.numFruit);
}