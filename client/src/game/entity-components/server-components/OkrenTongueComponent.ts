import { HitboxTag, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { getHitboxTag } from "../../hitboxes";

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
         switch (getHitboxTag(hitbox)) {
            case HitboxTag.okrenTongueSegmentMiddle: {
               const renderPart = new TexturedRenderPart(
                  hitbox,
                  0,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/okren/tongue-segment.png")
               );
               renderObject.attachRenderPart(renderPart);
               break;
            }
            case HitboxTag.okrenTongueSegmentTip: {
               const renderPart = new TexturedRenderPart(
                  hitbox,
                  0,
                  0,
                  0, 0,
                  getTextureArrayIndex("entities/okren/tongue-tip.png")
               );
               renderObject.attachRenderPart(renderPart);
               break;
            }
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