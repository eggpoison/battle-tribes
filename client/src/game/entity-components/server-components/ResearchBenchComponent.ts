import { PacketReader, customTickIntervalHasPassed, ServerComponentType, Entity } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createPaperParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface ResearchBenchComponentData {
   readonly isOccupied: boolean;
}

interface IntermediateInfo {}

export interface ResearchBenchComponent {
   isOccupied: boolean;
}

export const ResearchBenchComponentArray = new ServerComponentArray<ResearchBenchComponent, ResearchBenchComponentData, IntermediateInfo>(ServerComponentType.researchBench, true, createComponent, getMaxRenderParts, decodeData);
ResearchBenchComponentArray.populateIntermediateInfo = populateIntermediateInfo;
ResearchBenchComponentArray.onTick = onTick;
ResearchBenchComponentArray.updateFromData = updateFromData;

export function createResearchBenchComponentData(): ResearchBenchComponentData {
   return {
      isOccupied: false
   };
}

function decodeData(reader: PacketReader): ResearchBenchComponentData {
   const isOccupied = reader.readBool();
   return {
      isOccupied: isOccupied
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/research-bench/research-bench.png")
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): ResearchBenchComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const researchBenchComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.researchBench);
   return {
      isOccupied: researchBenchComponentData.isOccupied
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   if (researchBenchComponent.isOccupied && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.3)) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const pos = getRandomPositionInEntity(transformComponent);
      createPaperParticle(pos.x, pos.y);
   }
}

function updateFromData(data: ResearchBenchComponentData, entity: Entity): void {
   const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
   researchBenchComponent.isOccupied = data.isOccupied;
}