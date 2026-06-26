import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface GlurbTailSegmentComponentData {}

export interface GlurbTailSegmentComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.glurbTailSegment, typeof GlurbTailSegmentComponentArray> {}
}

export const GlurbTailSegmentComponentArray = registerClientComponentArray(
   ClientComponentType.glurbTailSegment,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
GlurbTailSegmentComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      // @Hack: 0.1 so that the moss ball can be z-index 0
      0.1,
      0,
      0, 0,
      TextureIndex.entities_glurb_glurbTailSegment
   );
   renderObject.attachRenderPart(renderPart);
}

function createComponent(): GlurbTailSegmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}