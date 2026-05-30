import { ServerComponentType, Settings, Entity, EntityType, PlantedEntityType, Packet, randAngle } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";
import { TransformComponentArray } from "./TransformComponent.js";
import { createEntity, destroyEntity, entityExists, getEntityLayer, getEntityType } from "../world.js";
import { PlantedComponentArray } from "./PlantedComponent.js";
import { createEntityConfigAttachInfo, EntityConfig, getConfigTransformComponent } from "../components.js";
import { createTreePlantedConfig } from "../entities/resources/tree-planted.js";
import { createIceSpikesPlantedConfig } from "../entities/resources/ice-spikes-planted.js";
import { createBerryBushPlantedConfig } from "../entities/resources/berry-bush-planted.js";

const enum Vars {
   FERTILISER_DURATION_TICKS = 300 * Settings.TICK_RATE
}

export class PlanterBoxComponent {
   public plant: Entity | null = null;
   public remainingFertiliserTicks = 0;

   /** Plant entity type that AI tribesman will attempt to place in the planter box */
   public replantEntityType: PlantedEntityType | null = null;
}

export const PlanterBoxComponentArray = new ComponentArray<PlanterBoxComponent>(ServerComponentType.planterBox, true, getDataLength, addDataToComponent);
PlanterBoxComponentArray.onTick = {
   tickInterval: 1,
   func: onTick
};
PlanterBoxComponentArray.onRemove = onRemove;

function onRemove(entity: Entity): void {
   // When a planter box is destroyed, destroy the plant that was in it
   
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);

   const plant = planterBoxComponent.plant;
   if (plant !== null) {
      destroyEntity(plant);
   }
}

function onTick(entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   if (planterBoxComponent.remainingFertiliserTicks > 0) {
      planterBoxComponent.remainingFertiliserTicks--;
   }
}

function getDataLength(): number {
   return 2 * Bytes.Float32;
}

function addDataToComponent(packet: Packet, entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   let plantedEntityType = -1;
   if (planterBoxComponent.plant !== null) {
      const plant = planterBoxComponent.plant;
      if (entityExists(plant)) {
         plantedEntityType = getEntityType(plant);
      }
   }

   packet.writeNumber(plantedEntityType);
   packet.writeBool(planterBoxComponent.remainingFertiliserTicks > 0);
}

export function placePlantInPlanterBox(planterBox: Entity, plantedEntityType: PlantedEntityType): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(planterBox);
   const transformComponent = TransformComponentArray.getComponent(planterBox);
   const planterBoxHitbox = transformComponent.hitboxes[0];

   // Create plant
   let config: EntityConfig;
   switch (plantedEntityType) {
      case EntityType.treePlanted: {
         config = createTreePlantedConfig(planterBoxHitbox.box.posX, planterBoxHitbox.box.posY, randAngle(), planterBox);
         break;
      }
      case EntityType.berryBushPlanted: {
         config = createBerryBushPlantedConfig(planterBoxHitbox.box.posX, planterBoxHitbox.box.posY, randAngle(), planterBox);
         break;
      }
      case EntityType.iceSpikesPlanted: {
         config = createIceSpikesPlantedConfig(planterBoxHitbox.box.posX, planterBoxHitbox.box.posY, randAngle(), planterBox);
         break;
      }
   }
   const plantTransformComponent = getConfigTransformComponent(config.components);
   const plantHitbox = plantTransformComponent.hitboxes[0];
   config.attachInfo = createEntityConfigAttachInfo(plantHitbox, planterBoxHitbox, false);
   planterBoxComponent.plant = createEntity(config, getEntityLayer(planterBox), 0);
   
   planterBoxComponent.replantEntityType = plantedEntityType;
}

export function fertilisePlanterBox(planterBoxComponent: PlanterBoxComponent): void {
   planterBoxComponent.remainingFertiliserTicks = Vars.FERTILISER_DURATION_TICKS;
}

export function getPlantGrowthSpeed(plant: Entity): number {
   const plantedComponent = PlantedComponentArray.getComponent(plant);

   const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantedComponent.planterBox);
   return planterBoxComponent.remainingFertiliserTicks > 0 ? 1.5 : 1;
}

export function plantIsFertilised(plant: Entity): boolean {
   const plantedComponent = PlantedComponentArray.getComponent(plant);

   const planterBoxComponent = PlanterBoxComponentArray.getComponent(plantedComponent.planterBox);
   return planterBoxComponent.remainingFertiliserTicks > 0;
}