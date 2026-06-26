import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface MithrilAnvilComponentData {}

export interface MithrilAnvilComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.mithrilAnvil, typeof MithrilAnvilComponentArray> {}
}

export const MithrilAnvilComponentArray = registerServerComponentArray(
   ServerComponentType.mithrilAnvil,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
MithrilAnvilComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): MithrilAnvilComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      TextureIndex.entities_mithrilAnvil_mithrilAnvil
   );
   renderObject.attachRenderPart(renderPart);
}

function createComponent(): MithrilAnvilComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

export function createMithrilAnvilComponentData(): MithrilAnvilComponentData {
   return {};
}