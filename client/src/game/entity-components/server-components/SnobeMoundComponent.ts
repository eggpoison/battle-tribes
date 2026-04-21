import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface SnobeMoundComponentData {}

interface IntermediateInfo {}

export interface SnobeMoundComponent {}

export const SnobeMoundComponentArray = new ServerComponentArray<SnobeMoundComponent, SnobeMoundComponentData, IntermediateInfo>(ServerComponentType.snobeMound, true, createComponent, getMaxRenderParts, decodeData);
SnobeMoundComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): SnobeMoundComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
         getTextureArrayIndex("entities/snobe-mound/snobe-mound.png")
      )
   );

   return {};
}

function createComponent(): SnobeMoundComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}