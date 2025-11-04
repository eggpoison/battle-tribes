import { HitboxFlag } from "../../../../../shared/src/boxes/boxes";
import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokTrunkComponentData {}

interface IntermediateInfo {}

export interface TukmokTrunkComponent {}

export const TukmokTrunkComponentArray = new ServerComponentArray<TukmokTrunkComponent, TukmokTrunkComponentData, IntermediateInfo>(ServerComponentType.tukmokTrunk, true, createComponent, getMaxRenderParts, decodeData);
TukmokTrunkComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): TukmokTrunkComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];

      const textureSource = hitbox.flags.includes(HitboxFlag.TUKMOK_TRUNK_HEAD) ? "entities/tukmok-trunk/head-segment.png" : "entities/tukmok-trunk/middle-segment.png";
      
      renderInfo.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            i * 0.02,
            0,
            getTextureArrayIndex(textureSource)
         )
      );
   }

   return {};
}

function createComponent(): TukmokTrunkComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz we can't access the num segments constant defined in the server
   return 8;
}