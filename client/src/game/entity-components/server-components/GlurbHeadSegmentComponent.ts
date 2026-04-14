import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      0, 0,
      getTextureArrayIndex("entities/glurb/glurb-head-segment.png")
   );
   addRenderPartTag(renderPart, "tamingComponent:head");
   renderObject.attachRenderPart(renderPart);

   // Eyes
   for (let j = 0; j < 2; j++) {
      const eyeRenderPart = new TexturedRenderPart(
         renderPart,
         0,
         0.3,
         16, 14,
         getTextureArrayIndex("entities/glurb/glurb-eye.png")
      );
      if (j === 1) {
         eyeRenderPart.setFlipX(true);
      }
      renderObject.attachRenderPart(eyeRenderPart);
   }

   return {};
}

function createComponent(): GlurbHeadSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 3;
}