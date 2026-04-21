import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface TukmokTailClubComponentData {}

interface IntermediateInfo {}

export interface TukmokTailClubComponent {}

export const TukmokTailClubComponentArray = new ServerComponentArray<TukmokTailClubComponent, TukmokTailClubComponentData, IntermediateInfo>(ServerComponentType.tukmokTailClub, true, createComponent, getMaxRenderParts, decodeData);
TukmokTailClubComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): TukmokTailClubComponentData {
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
         getTextureArrayIndex("entities/tukmok-tail-club/club-segment.png")
      )
   );

   return {};
}

function createComponent(): TukmokTailClubComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}