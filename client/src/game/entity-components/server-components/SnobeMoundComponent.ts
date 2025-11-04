import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface SnobeMoundComponentData {}

interface IntermediateInfo {}

export interface SnobeMoundComponent {}

export const SnobeMoundComponentArray = new ServerComponentArray<SnobeMoundComponent, SnobeMoundComponentData, IntermediateInfo>(ServerComponentType.snobeMound, true, createComponent, getMaxRenderParts, decodeData);
SnobeMoundComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): SnobeMoundComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex("entities/snobe-mound/snobe-mound.png")
      )
   );

   return {};
}

function createComponent(): SnobeMoundComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}