import { randFloat, ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface RiverSteppingStoneComponentData {}

interface IntermediateInfo {}

export interface RiverSteppingStoneComponent {}

export const RiverSteppingStoneComponentArray = new ServerComponentArray<RiverSteppingStoneComponent, RiverSteppingStoneComponentData, IntermediateInfo>(ServerComponentType.riverSteppingStone, true, createComponent, getMaxRenderParts, decodeData);
RiverSteppingStoneComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): RiverSteppingStoneComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   let textureSource: string;
   if (hitbox.flags.includes(HitboxFlag.RIVER_STEPPING_STONE_SMALL)) {
      textureSource = "entities/river-stepping-stone/stone-small.png";
   } else if (hitbox.flags.includes(HitboxFlag.RIVER_STEPPING_STONE_MEDIUM)) {
      textureSource = "entities/river-stepping-stone/stone-medium.png";
   } else {
      textureSource = "entities/river-stepping-stone/stone-large.png";
   }
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(textureSource)
   );
   renderPart.tintR = randFloat(-0.03, 0.03);
   renderPart.tintG = randFloat(-0.03, 0.03);
   renderPart.tintB = randFloat(-0.03, 0.03);
   renderInfo.attachRenderPart(renderPart)

   return {
      renderPart: renderPart
   };
}

function createComponent(): RiverSteppingStoneComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}