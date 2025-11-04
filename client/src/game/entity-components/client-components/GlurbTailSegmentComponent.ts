import { ServerComponentType } from "battletribes-shared/components";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface GlurbTailSegmentComponentData {}

interface IntermediateInfo {}

export interface GlurbTailSegmentComponent {}

export const GlurbTailSegmentComponentArray = new ClientComponentArray<GlurbTailSegmentComponent, IntermediateInfo>(ClientComponentType.glurbTailSegment, true, createComponent, getMaxRenderParts);
GlurbTailSegmentComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const textureSource = "entities/glurb/glurb-tail-segment.png";
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GlurbTailSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}