import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";

export interface StonecarvingTableComponentData {}

interface IntermediateInfo {}

export interface StonecarvingTableComponent {}

export const StonecarvingTableComponentArray = new ClientComponentArray<StonecarvingTableComponent, IntermediateInfo>(ClientComponentType.stonecarvingTable, true, createComponent, getMaxRenderParts);
StonecarvingTableComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createStonecarvingTableComponentData(): StonecarvingTableComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponent = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponent.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         getTextureArrayIndex("entities/stonecarving-table/stonecarving-table.png")
      )
   );

   return {};
}

function createComponent(): StonecarvingTableComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}