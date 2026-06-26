import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { customTickIntervalHasPassed } from "../../../../../shared/src/utils";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createPaperParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData, getEntityAgeTicks } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface ResearchBenchComponentData {
   readonly isOccupied: boolean;
}

export interface ResearchBenchComponent {
   isOccupied: boolean;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.researchBench, typeof ResearchBenchComponentArray> {}
}

export const ResearchBenchComponentArray = registerServerComponentArray(
   ServerComponentType.researchBench,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
ResearchBenchComponentArray.populateIntermediateInfo = populateIntermediateInfo;
ResearchBenchComponentArray.onTick = onTick;
ResearchBenchComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): ResearchBenchComponentData {
   const isOccupied = reader.readBool();
   return {
      isOccupied: isOccupied
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_researchBench_researchBench
      )
   );
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

export function createResearchBenchComponentData(): ResearchBenchComponentData {
   return {
      isOccupied: false
   };
}