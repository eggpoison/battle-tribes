import { PacketReader, customTickIntervalHasPassed, ServerComponentType, Entity } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { createPaperParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData, getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";

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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/research-bench/research-bench.png")
      )
   );

   return {};
}

function createComponent(entityComponentData: EntityComponentData): ResearchBenchComponent {
   return {
      isOccupied: entityComponentData.serverComponentData.get(ServerComponentType.researchBench)!.isOccupied
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