import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      0, 0,
      getTextureArrayIndex("entities/glurb/glurb-middle-segment.png")
   );
   renderObject.attachRenderPart(renderPart);

   return {};
}

function createComponent(): GlurbBodySegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}