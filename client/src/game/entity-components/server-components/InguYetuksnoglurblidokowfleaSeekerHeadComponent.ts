import { HitboxFlag, ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { getTransformComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponentData {}

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, _InguYetuksnoglurblidokowfleaSeekerHeadComponentArray, InguYetuksnoglurblidokowfleaSeekerHeadComponentData> {}
}

class _InguYetuksnoglurblidokowfleaSeekerHeadComponentArray extends _ServerComponentArray<InguYetuksnoglurblidokowfleaSeekerHeadComponent, InguYetuksnoglurblidokowfleaSeekerHeadComponentData> {
   public decodeData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentData {
      return {};
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

      for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
         const hitbox = transformComponentData.hitboxes[i];
         if (hitbox.flags.includes(HitboxFlag.YETUK_TRUNK_MIDDLE)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.7,
               0,
               0, 0,
               getTextureArrayIndex("entities/tukmok-trunk/middle-segment.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.YETUK_TRUNK_HEAD)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.7,
               0,
               0, 0,
               getTextureArrayIndex("entities/tukmok-trunk/head-segment.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.COW_HEAD)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.7,
               0,
               0, 0,
               getTextureArrayIndex("entities/cow/cow-head-1.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_HEAD)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.7,
               0,
               0, 0,
               getTextureArrayIndex("entities/tukmok/head.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_BIG)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.6,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/adult/mandible.png")
            );
            renderObject.attachRenderPart(renderPart);
         } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_MEDIUM)) {
            const renderPart = new TexturedRenderPart(
               hitbox,
               4.6,
               0,
               0, 0,
               getTextureArrayIndex("entities/okren/juvenile/mandible.png")
            );
            renderObject.attachRenderPart(renderPart);
         }
      }
   }

   public createComponent(): InguYetuksnoglurblidokowfleaSeekerHeadComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 50;
   }
}

export const InguYetuksnoglurblidokowfleaSeekerHeadComponentArray = registerServerComponentArray(ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, _InguYetuksnoglurblidokowfleaSeekerHeadComponentArray, true);

export function createInguYetuksnoglurblidokowfleaSeekerHeadComponentData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentData {
   return {};
}