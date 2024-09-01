import { PlanterBoxPlant, ServerComponentType } from "webgl-test-shared/dist/components";
import { Settings } from "webgl-test-shared/dist/settings";
import { ComponentArray } from "./ComponentArray";
import { PlanterBoxComponentArray } from "./PlanterBoxComponent";
import { ComponentConfig } from "../components";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface PlantComponentParams {
   planterBox: EntityID;
   plantType: PlanterBoxPlant;
}

const PLANT_HEALTHS: Record<PlanterBoxPlant, number> = {
   [PlanterBoxPlant.tree]: 10,
   [PlanterBoxPlant.berryBush]: 10,
   [PlanterBoxPlant.iceSpikes]: 5,
};

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

   constructor(params: PlantComponentParams) {
      this.planterBox = params.planterBox;
      this.plantType = params.plantType;
   }
}

export const PlantComponentArray = new ComponentArray<PlantComponent>(ServerComponentType.plant, true, {
   onInitialise: onInitialise,
   onTick: {
      tickInterval: 1,
      func: onTick
   },
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onInitialise(config: ComponentConfig<ServerComponentType.health | ServerComponentType.plant>): void {
   const plantType = config[ServerComponentType.plant].plantType;

   config[ServerComponentType.health].maxHealth = PLANT_HEALTHS[plantType];
}

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