import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { randAngle } from "../../../../../shared/src/utils";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface DustfleaEggComponentData {}

interface IntermediateInfo {}

export interface DustfleaEggComponent {}

export const DustfleaEggComponentArray = new ServerComponentArray<DustfleaEggComponent, DustfleaEggComponentData, IntermediateInfo>(ServerComponentType.dustfleaEgg, true, createComponent, getMaxRenderParts, decodeData);
DustfleaEggComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      getTextureArrayIndex("entities/dustflea-egg/dustflea-egg.png")
   );
   renderInfo.attachRenderPart(renderPart);

   const dustfleaRenderPart = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(), // @Sync
      getTextureArrayIndex("entities/dustflea/dustflea.png")
   );
   dustfleaRenderPart.inheritParentRotation = false;
   renderInfo.attachRenderPart(dustfleaRenderPart);

   return {};
}

export function createDustfleaEggComponentData(): DustfleaEggComponentData {
   return {};
}

function decodeData(): DustfleaEggComponentData {
   return createDustfleaEggComponentData();
}

function createComponent(): DustfleaEggComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}