import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface MithrilAnvilComponentData {}

interface IntermediateInfo {}

export interface MithrilAnvilComponent {}

export const MithrilAnvilComponentArray = new ServerComponentArray<MithrilAnvilComponent, MithrilAnvilComponentData, IntermediateInfo>(ServerComponentType.mithrilAnvil, true, createComponent, getMaxRenderParts, decodeData);
MithrilAnvilComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createMithrilAnvilComponentData(): MithrilAnvilComponentData {
   return {};
}

function decodeData(): MithrilAnvilComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/mithril-anvil/mithril-anvil.png")
   );
   renderInfo.attachRenderPart(renderPart);
   
   return {};
}

function createComponent(): MithrilAnvilComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}