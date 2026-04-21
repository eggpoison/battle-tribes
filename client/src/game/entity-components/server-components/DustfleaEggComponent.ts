import { randAngle, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../../entity-component-types";

export interface DustfleaEggComponentData {}

interface IntermediateInfo {}

export interface DustfleaEggComponent {}

export const DustfleaEggComponentArray = new ServerComponentArray<DustfleaEggComponent, DustfleaEggComponentData, IntermediateInfo>(ServerComponentType.dustfleaEgg, true, createComponent, getMaxRenderParts, decodeData);
DustfleaEggComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const renderPart = new TexturedRenderPart(
      hitbox,
      1,
      0,
      0, 0,
      getTextureArrayIndex("entities/dustflea-egg/dustflea-egg.png")
   );
   renderObject.attachRenderPart(renderPart);

   const dustfleaRenderPart = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(), // @Sync
      0, 0,
      getTextureArrayIndex("entities/dustflea/dustflea.png")
   );
   dustfleaRenderPart.inheritParentRotation = false;
   renderObject.attachRenderPart(dustfleaRenderPart);

   return {};
}

export function createDustfleaEggComponentData(): DustfleaEggComponentData {
   return {};
}

function decodeData(): DustfleaEggComponentData {
   return createDustfleaEggComponentData();
}

function createComponent(): DustfleaEggComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}