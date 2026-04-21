import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface GlurbBodySegmentComponentData {}

export interface GlurbBodySegmentComponent {}

class _GlurbBodySegmentComponentArray extends ServerComponentArray<GlurbBodySegmentComponent, GlurbBodySegmentComponentData> {
   public decodeData(): GlurbBodySegmentComponentData {
      return createGlurbHeadSegmentComponentData();
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
   }

   public createComponent(): GlurbBodySegmentComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const GlurbBodySegmentComponentArray = registerServerComponentArray(ServerComponentType.glurbBodySegment, _GlurbBodySegmentComponentArray, true);

export function createGlurbHeadSegmentComponentData(): GlurbBodySegmentComponentData {
   return {};
}