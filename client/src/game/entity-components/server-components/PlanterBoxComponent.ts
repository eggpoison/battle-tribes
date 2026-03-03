import { randInt, customTickIntervalHasPassed, PacketReader, Entity, EntityType, PlantedEntityType, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { Hitbox } from "../../hitboxes";
import { createGrowthParticle } from "../../particles";
import { VisualRenderPart } from "../../render-parts/render-parts";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { playSoundOnHitbox } from "../../sound";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { getEntityRenderInfo, getEntityAgeTicks, EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponent, TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";

export interface PlanterBoxComponentData {
   readonly plantedEntityType: PlantedEntityType | -1;
   readonly isFertilised: boolean;
}

interface IntermediateInfo {
   readonly moundRenderPart: VisualRenderPart | null;
}

export interface PlanterBoxComponent {
   moundRenderPart: VisualRenderPart | null;
   
   hasPlant: boolean;
   isFertilised: boolean;
}

const createMoundRenderPart = (plantedEntityType: PlantedEntityType, parentHitbox: Hitbox): TexturedRenderPart => {
   const textureSource = plantedEntityType === EntityType.iceSpikesPlanted ? "entities/plant/snow-clump.png" : "entities/plant/dirt-clump.png";
   return new TexturedRenderPart(
      parentHitbox,
      1,
      Math.PI / 2 * randInt(0, 3),
      getTextureArrayIndex(textureSource)
   );
}

export const PlanterBoxComponentArray = new ServerComponentArray<PlanterBoxComponent, PlanterBoxComponentData, IntermediateInfo>(ServerComponentType.planterBox, true, createComponent, getMaxRenderParts, decodeData);
PlanterBoxComponentArray.populateIntermediateInfo = populateIntermediateInfo;
PlanterBoxComponentArray.onTick = onTick;
PlanterBoxComponentArray.updateFromData = updateFromData;

export function createPlanterBoxComponentData(): PlanterBoxComponentData {
   return {
      plantedEntityType: -1,
      isFertilised: false
   };
}

function decodeData(reader: PacketReader): PlanterBoxComponentData {
   const plantedEntityType = reader.readNumber();
   const isFertilised = reader.readBool();
   return {
      plantedEntityType: plantedEntityType,
      isFertilised: isFertilised
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/planter-box/planter-box.png")
      )
   );
   
   const planterBoxComponentData = entityComponentData.serverComponentData.get(ServerComponentType.planterBox)!;

   let renderPart: TexturedRenderPart | null;
   if (planterBoxComponentData.plantedEntityType !== -1) {
      renderPart = createMoundRenderPart(planterBoxComponentData.plantedEntityType, hitbox);
      renderInfo.attachRenderPart(renderPart);
   } else {
      renderPart = null;
   }
   
   return {
      moundRenderPart: renderPart
   };
}

function createComponent(entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): PlanterBoxComponent {
   const planterBoxComponentData = entityComponentData.serverComponentData.get(ServerComponentType.planterBox)!;
   
   return {
      hasPlant: planterBoxComponentData.plantedEntityType !== -1,
      isFertilised: planterBoxComponentData.isFertilised,
      moundRenderPart: intermediateInfo.moundRenderPart
   };
}

function getMaxRenderParts(): number {
   // Planter box, and mound
   return 2;
}

const createGrowthParticleInEntity = (transformComponent: TransformComponent): void => {
   const pos = getRandomPositionInEntity(transformComponent);
   createGrowthParticle(pos.x, pos.y);
}
   
function onTick(entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   if (planterBoxComponent.isFertilised && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.35)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      createGrowthParticleInEntity(transformComponent);
   }
}

function updateFromData(data: PlanterBoxComponentData, entity: Entity): void {
   const planterBoxComponent = PlanterBoxComponentArray.getComponent(entity);
   
   const plantType = data.plantedEntityType;
   const isFertilised = data.isFertilised;
   
   if (isFertilised && !planterBoxComponent.isFertilised) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      for (let i = 0; i < 25; i++) {
         createGrowthParticleInEntity(transformComponent);
      }

      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("fertiliser.mp3", 0.6, 1, entity, hitbox, false);
   }
   planterBoxComponent.isFertilised = isFertilised;
   
   const hasPlant = plantType !== -1;
   if (hasPlant && planterBoxComponent.hasPlant !== hasPlant) {
      // Plant sound effect
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      playSoundOnHitbox("plant.mp3", 0.4, 1, entity, hitbox, false);
   }
   planterBoxComponent.hasPlant = hasPlant;

   if (plantType !== -1) {
      if (planterBoxComponent.moundRenderPart === null) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];

         planterBoxComponent.moundRenderPart = createMoundRenderPart(plantType, hitbox);
         
         const renderInfo = getEntityRenderInfo(entity);
         renderInfo.attachRenderPart(planterBoxComponent.moundRenderPart);
      }
   } else if (planterBoxComponent.moundRenderPart !== null) {
      const renderInfo = getEntityRenderInfo(entity);
      renderInfo.removeRenderPart(planterBoxComponent.moundRenderPart);
      planterBoxComponent.moundRenderPart = null;
   }
}