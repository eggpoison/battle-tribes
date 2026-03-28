import { ServerComponentType, HitboxFlag } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface TukmokTrunkComponentData {}

interface IntermediateInfo {}

export interface TukmokTrunkComponent {}

export const TukmokTrunkComponentArray = new ServerComponentArray<TukmokTrunkComponent, TukmokTrunkComponentData, IntermediateInfo>(ServerComponentType.tukmokTrunk, true, createComponent, getMaxRenderParts, decodeData);
TukmokTrunkComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): TukmokTrunkComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);

   for (let i = 0; i < transformComponentData.hitboxes.length; i++) {
      const hitbox = transformComponentData.hitboxes[i];

      const textureSource = hitbox.flags.includes(HitboxFlag.TUKMOK_TRUNK_HEAD) ? "entities/tukmok-trunk/head-segment.png" : "entities/tukmok-trunk/middle-segment.png";
      
      renderObject.attachRenderPart(
         new TexturedRenderPart(
            hitbox,
            i * 0.02,
            0,
            0, 0,
            getTextureArrayIndex(textureSource)
         )
      );
   }

   return {};
}

function createComponent(): TukmokTrunkComponent {
   return {};
}

function getMaxRenderParts(): number {
   // @HACK cuz we can't access the num segments constant defined in the server
   return 8;
}