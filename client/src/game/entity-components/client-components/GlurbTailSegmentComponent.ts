import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";
import { registerClientComponentArray } from "../component-register";

export interface GlurbTailSegmentComponentData {}

export interface GlurbTailSegmentComponent {}

class _GlurbTailSegmentComponentArray extends ClientComponentArray<GlurbTailSegmentComponent> {
   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];

      const textureSource = "entities/glurb/glurb-tail-segment.png";
      
      const renderPart = new TexturedRenderPart(
         hitbox,
         // @Hack: 0.1 so that the moss ball can be z-index 0
         0.1,
         0,
         0, 0,
         getTextureArrayIndex(textureSource)
      );
      renderObject.attachRenderPart(renderPart);
   }

   public createComponent(): GlurbTailSegmentComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 1;
   }
}

export const GlurbTailSegmentComponentArray = registerClientComponentArray(ClientComponentType.glurbTailSegment, _GlurbTailSegmentComponentArray, true);