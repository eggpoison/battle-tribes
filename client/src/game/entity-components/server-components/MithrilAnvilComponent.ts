import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../entity-component-types";

export interface MithrilAnvilComponentData {}

interface IntermediateInfo {}

export interface MithrilAnvilComponent {}

export const MithrilAnvilComponentArray = new ServerComponentArray<MithrilAnvilComponent, MithrilAnvilComponentData, IntermediateInfo>(ServerComponentType.mithrilAnvil, true, createComponent, getMaxRenderParts, decodeData);
MithrilAnvilComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createMithrilAnvilComponentData(): MithrilAnvilComponentData {
   return {};
}

function decodeData(): MithrilAnvilComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex("entities/mithril-anvil/mithril-anvil.png")
   );
   renderObject.attachRenderPart(renderPart);
   
   return {};
}

function createComponent(): MithrilAnvilComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}