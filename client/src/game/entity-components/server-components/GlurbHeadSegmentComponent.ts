import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { addRenderPartTag } from "../../render-parts/render-part-tags";
import { registerServerComponentArray } from "../component-registry";

export interface GlurbHeadSegmentComponentData {}

export interface GlurbHeadSegmentComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.glurbHeadSegment, _GlurbHeadSegmentComponentArray, GlurbHeadSegmentComponentData> {}
}

class _GlurbHeadSegmentComponentArray extends _ServerComponentArray<GlurbHeadSegmentComponent, GlurbHeadSegmentComponentData> {
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