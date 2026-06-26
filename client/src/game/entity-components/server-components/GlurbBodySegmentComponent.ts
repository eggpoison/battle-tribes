import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface GlurbBodySegmentComponentData {}

export interface GlurbBodySegmentComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.glurbBodySegment, typeof GlurbBodySegmentComponentArray> {}
}

export const GlurbBodySegmentComponentArray = registerServerComponentArray(
   ServerComponentType.glurbBodySegment,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
GlurbBodySegmentComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): GlurbBodySegmentComponentData {
   return createGlurbHeadSegmentComponentData();
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      0, 0,
      TextureIndex.entities_glurb_glurbMiddleSegment
   );
   renderObject.attachRenderPart(renderPart);
}

function createComponent(): GlurbBodySegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

export function createGlurbHeadSegmentComponentData(): GlurbBodySegmentComponentData {
   return {};
}