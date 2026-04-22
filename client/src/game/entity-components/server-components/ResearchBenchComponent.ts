import { PacketReader, customTickIntervalHasPassed, ServerComponentType, Entity } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import { createPaperParticle } from "../../particles";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData, getEntityAgeTicks } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { TransformComponentArray, getRandomPositionInEntity } from "./TransformComponent";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface ResearchBenchComponentData {
   readonly isOccupied: boolean;
}

export interface ResearchBenchComponent {
   isOccupied: boolean;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.researchBench, _ResearchBenchComponentArray, ResearchBenchComponentData> {}
}

class _ResearchBenchComponentArray extends _ServerComponentArray<ResearchBenchComponent, ResearchBenchComponentData> {
   public decodeData(reader: PacketReader): ResearchBenchComponentData {
      const isOccupied = reader.readBool();
      return {
         isOccupied: isOccupied
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
   }

   public createComponent(entityComponentData: EntityComponentData): ResearchBenchComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const researchBenchComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.researchBench);
      return {
         isOccupied: researchBenchComponentData.isOccupied
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
      if (researchBenchComponent.isOccupied && customTickIntervalHasPassed(getEntityAgeTicks(entity), 0.3)) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const pos = getRandomPositionInEntity(transformComponent);
         createPaperParticle(pos.x, pos.y);
      }
   }

   public updateFromData(data: ResearchBenchComponentData, entity: Entity): void {
      const researchBenchComponent = ResearchBenchComponentArray.getComponent(entity);
      researchBenchComponent.isOccupied = data.isOccupied;
   }
}

export const ResearchBenchComponentArray = registerServerComponentArray(ServerComponentType.researchBench, _ResearchBenchComponentArray, true);

export function createResearchBenchComponentData(): ResearchBenchComponentData {
   return {
      isOccupied: false
   };
}