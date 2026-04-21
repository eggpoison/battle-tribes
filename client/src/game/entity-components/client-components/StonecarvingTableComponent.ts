import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface StonecarvingTableComponentData {}

interface IntermediateInfo {}

export interface StonecarvingTableComponent {}

export const StonecarvingTableComponentArray = new ClientComponentArray<StonecarvingTableComponent, IntermediateInfo>(ClientComponentType.stonecarvingTable, true, createComponent, getMaxRenderParts);
StonecarvingTableComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createStonecarvingTableComponentData(): StonecarvingTableComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponent = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponent.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
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