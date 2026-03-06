import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface TukmokTailClubComponentData {}

interface IntermediateInfo {}

export interface TukmokTailClubComponent {}

export const TukmokTailClubComponentArray = new ServerComponentArray<TukmokTailClubComponent, TukmokTailClubComponentData, IntermediateInfo>(ServerComponentType.tukmokTailClub, true, createComponent, getMaxRenderParts, decodeData);
TukmokTailClubComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): TukmokTailClubComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/tukmok-tail-club/club-segment.png")
      )
   );

   return {};
}

function createComponent(): TukmokTailClubComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}