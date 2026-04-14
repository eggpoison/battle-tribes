import { randAngle, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";

export interface PebblumComponentData {}

interface IntermediateInfo {}

export interface PebblumComponent {}

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent, PebblumComponentData, IntermediateInfo>(ServerComponentType.pebblum, true, createComponent, getMaxRenderParts, decodeData);
PebblumComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): PebblumComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   // Nose
   const nose = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(),
      0, 12,
      getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
   )
   renderObject.attachRenderPart(nose);

   // Body
   const body = new TexturedRenderPart(
      hitbox,
      1,
      randAngle(),
      0, -8,
      getTextureArrayIndex("entities/pebblum/pebblum-body.png")
   )
   renderObject.attachRenderPart(body);

   return {};
}

function createComponent(): PebblumComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}