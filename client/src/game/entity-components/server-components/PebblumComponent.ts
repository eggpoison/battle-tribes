import { randAngle, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getTransformComponentData } from "../../networking/packet-snapshots";

export interface PebblumComponentData {}

interface IntermediateInfo {}

export interface PebblumComponent {}

export const PebblumComponentArray = new ServerComponentArray<PebblumComponent, PebblumComponentData, IntermediateInfo>(ServerComponentType.pebblum, true, createComponent, getMaxRenderParts, decodeData);
PebblumComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): PebblumComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   // Nose
   const nose = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(),
      getTextureArrayIndex("entities/pebblum/pebblum-nose.png")
   )
   nose.offset.y = 12;
   renderInfo.attachRenderPart(nose);

   // Body
   const body = new TexturedRenderPart(
      hitbox,
      1,
      randAngle(),
      getTextureArrayIndex("entities/pebblum/pebblum-body.png")
   )
   body.offset.y = -8;
   renderInfo.attachRenderPart(body);

   return {};
}

function createComponent(): PebblumComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}