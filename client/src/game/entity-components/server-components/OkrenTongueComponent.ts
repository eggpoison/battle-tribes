import { ServerComponentType } from "webgl-test-shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { HitboxFlag } from "../../../../../shared/src/boxes/boxes";

export interface OkrenTongueComponentData {}

interface IntermediateInfo {}

export interface OkrenTongueComponent {}

export const OkrenTongueComponentArray = new ServerComponentArray<OkrenTongueComponent, OkrenTongueComponentData, IntermediateInfo>(ServerComponentType.okrenTongue, true, createComponent, getMaxRenderParts, decodeData);
OkrenTongueComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createOkrenTongueComponentData(): OkrenTongueComponentData {
   return {};
}

function decodeData(): OkrenTongueComponentData {
   return createOkrenTongueComponentData();
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;

   for (const hitbox of transformComponentData.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_MIDDLE)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/okren/tongue-segment.png")
         );
         renderInfo.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_TIP)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            getTextureArrayIndex("entities/okren/tongue-tip.png")
         );
         renderInfo.attachRenderPart(renderPart);
      }
   }

   return {};
}

function createComponent(): OkrenTongueComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz tehre isn't a limit!!
   return 100;
}