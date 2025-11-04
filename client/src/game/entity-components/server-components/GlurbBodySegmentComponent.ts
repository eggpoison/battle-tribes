import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface GlurbBodySegmentComponentData {}

interface IntermediateInfo {}

export interface GlurbBodySegmentComponent {}

export const GlurbBodySegmentComponentArray = new ServerComponentArray<GlurbBodySegmentComponent, GlurbBodySegmentComponentData, IntermediateInfo>(ServerComponentType.glurbBodySegment, true, createComponent, getMaxRenderParts, decodeData);
GlurbBodySegmentComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createGlurbHeadSegmentComponentData(): GlurbBodySegmentComponentData {
   return {};
}

function decodeData(): GlurbBodySegmentComponentData {
   return createGlurbHeadSegmentComponentData();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GlurbBodySegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}