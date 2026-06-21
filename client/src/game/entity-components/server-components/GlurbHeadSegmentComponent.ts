import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface GlurbHeadSegmentComponentData {}

export interface GlurbHeadSegmentComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.glurbHeadSegment, _GlurbHeadSegmentComponentArray> {}
}

class _GlurbHeadSegmentComponentArray extends ServerComponentArray<GlurbHeadSegmentComponent, GlurbHeadSegmentComponentData> {
   public decodeData(): GlurbHeadSegmentComponentData {
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
         TextureIndex.entities_glurb_glurbHeadSegment
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
            TextureIndex.entities_glurb_glurbEye
         );
         if (j === 1) {
            eyeRenderPart.setFlipX(true);
         }
         renderObject.attachRenderPart(eyeRenderPart);
      }
   }

   public createComponent(): GlurbHeadSegmentComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 3;
   }
}

export const GlurbHeadSegmentComponentArray = registerServerComponentArray(ServerComponentType.glurbHeadSegment, _GlurbHeadSegmentComponentArray, true);

export function createGlurbHeadSegmentComponentData(): GlurbHeadSegmentComponentData {
   return {};
}