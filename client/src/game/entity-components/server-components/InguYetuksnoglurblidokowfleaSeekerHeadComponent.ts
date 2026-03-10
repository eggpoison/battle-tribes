import { HitboxFlag, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { getTransformComponentData } from "../../entity-component-types";

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponentData {}

interface IntermediateInfo {}

export interface InguYetuksnoglurblidokowfleaSeekerHeadComponent {}

export const InguYetuksnoglurblidokowfleaSeekerHeadComponentArray = new ServerComponentArray<InguYetuksnoglurblidokowfleaSeekerHeadComponent, InguYetuksnoglurblidokowfleaSeekerHeadComponentData, IntermediateInfo>(ServerComponentType.inguYetuksnoglurblidokowfleaSeekerHead, true, createComponent, getMaxRenderParts, decodeData);
InguYetuksnoglurblidokowfleaSeekerHeadComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createInguYetuksnoglurblidokowfleaSeekerHeadComponentData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentData {
   return {};
}

function decodeData(): InguYetuksnoglurblidokowfleaSeekerHeadComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];
      if (hitbox.flags.includes(HitboxFlag.YETUK_TRUNK_MIDDLE)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/tukmok-trunk/middle-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_TRUNK_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/tukmok-trunk/head-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.COW_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/cow/cow-head-1.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.TUKMOK_HEAD)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.7,
            0,
            getTextureArrayIndex("entities/tukmok/head.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_BIG)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.6,
            0,
            getTextureArrayIndex("entities/okren/adult/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.YETUK_MANDIBLE_MEDIUM)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            4.6,
            0,
            getTextureArrayIndex("entities/okren/juvenile/mandible.png")
         );
         renderInfo.attachRenderPart(renderPart);
      }
   }

   return {};
}

function createComponent(): InguYetuksnoglurblidokowfleaSeekerHeadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 50;
}