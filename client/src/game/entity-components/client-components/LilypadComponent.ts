import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface LilypadComponentData {}

interface IntermediateInfo {}

export interface LilypadComponent {}

export const LilypadComponentArray = new ClientComponentArray<LilypadComponent, IntermediateInfo>(ClientComponentType.lilypad, true, createComponent, getMaxRenderParts);
LilypadComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createLilypadComponentData(): LilypadComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/lilypad/lilypad.png")
      )
   );

   return {};
}

function createComponent(): LilypadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}