import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface FrostshaperComponentData {}

interface IntermediateInfo {}

export interface FrostshaperComponent {}

export const FrostshaperComponentArray = new ClientComponentArray<FrostshaperComponent, IntermediateInfo>(ClientComponentType.frostshaper, true, createComponent, getMaxRenderParts);
FrostshaperComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createFrostshaperComponentData(): FrostshaperComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         getTextureArrayIndex("entities/frostshaper/frostshaper.png")
      )
   );

   return {};
}

function createComponent(): FrostshaperComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}