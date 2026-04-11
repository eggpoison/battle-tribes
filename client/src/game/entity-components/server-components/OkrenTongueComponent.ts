import { HitboxFlag, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { getTransformComponentData } from "../../entity-component-types";

export interface OkrenTongueComponentData {}

interface IntermediateInfo {}

export interface OkrenTongueComponent {}

export const OkrenTongueComponentArray = new ServerComponentArray<OkrenTongueComponent, OkrenTongueComponentData, IntermediateInfo>(ServerComponentType.okrenTongue, true, createComponent, getMaxRenderParts, decodeData);
OkrenTongueComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createOkrenTongueComponentData(): OkrenTongueComponentData {
   return {};
}

function decodeData(): OkrenTongueComponentData {
   return createOkrenTongueComponentData();
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   for (const hitbox of transformComponentData.hitboxes) {
      if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_MIDDLE)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/okren/tongue-segment.png")
         );
         renderObject.attachRenderPart(renderPart);
      } else if (hitbox.flags.includes(HitboxFlag.OKREN_TONGUE_SEGMENT_TIP)) {
         const renderPart = new TexturedRenderPart(
            hitbox,
            0,
            0,
            0, 0,
            getTextureArrayIndex("entities/okren/tongue-tip.png")
         );
         renderObject.attachRenderPart(renderPart);
      }
   }

   return {};
}

function createComponent(): OkrenTongueComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz tehre isn't a limit!!
   return 100;
}