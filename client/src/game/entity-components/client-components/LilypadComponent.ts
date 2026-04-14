import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface LilypadComponentData {}

interface IntermediateInfo {}

export interface LilypadComponent {}

export const LilypadComponentArray = new ClientComponentArray<LilypadComponent, IntermediateInfo>(ClientComponentType.lilypad, true, createComponent, getMaxRenderParts);
LilypadComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createLilypadComponentData(): LilypadComponentData {
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