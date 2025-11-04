import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface GlurbHeadSegmentComponentData {}

interface IntermediateInfo {}

export interface GlurbHeadSegmentComponent {}

export const GlurbHeadSegmentComponentArray = new ServerComponentArray<GlurbHeadSegmentComponent, GlurbHeadSegmentComponentData, IntermediateInfo>(ServerComponentType.glurbHeadSegment, true, createComponent, getMaxRenderParts, decodeData);
GlurbHeadSegmentComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createGlurbHeadSegmentComponentData(): GlurbHeadSegmentComponentData {
   return {};
}

function decodeData(): GlurbHeadSegmentComponentData {
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
      getTextureArrayIndex("entities/glurb/glurb-head-segment.png")
   );
   renderPart.addTag("tamingComponent:head");
   renderInfo.attachRenderPart(renderPart);

   // Eyes
   for (let j = 0; j < 2; j++) {
      const eyeRenderPart = new TexturedRenderPart(
         renderPart,
         0,
         0.3,
         getTextureArrayIndex("entities/glurb/glurb-eye.png")
      );
      if (j === 1) {
         eyeRenderPart.setFlipX(true);
      }
      eyeRenderPart.offset.x = 16;
      eyeRenderPart.offset.y = 14;
      renderInfo.attachRenderPart(eyeRenderPart);
   }

   return {};
}

function createComponent(): GlurbHeadSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}