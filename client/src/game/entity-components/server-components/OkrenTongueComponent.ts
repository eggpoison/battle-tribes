import { HitboxFlag, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface OkrenTongueComponentData {}

export interface OkrenTongueComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.okrenTongue, _OkrenTongueComponentArray> {}
}

class _OkrenTongueComponentArray extends _ServerComponentArray<OkrenTongueComponent, OkrenTongueComponentData> {
   public decodeData(): OkrenTongueComponentData {
      return createOkrenTongueComponentData();
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      for (const hitbox of transformComponentData.hitboxes) {
         if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_MIDDLE)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/tongue-segment.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_TIP)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               0,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/tongue-tip.png")
            );
            renderObject.attachRenderPart(renderPart);
         }
      }
   }

   public createComponent(): OkrenTongueComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      // @HACK cuz tehre isn't a limit!!
      return 100;
   }
}

export const OkrenTongueComponentArray = registerServerComponentArray(ServerComponentType.okrenTongue, _OkrenTongueComponentArray, true);

export function createOkrenTongueComponentData(): OkrenTongueComponentData {
   return {};
}