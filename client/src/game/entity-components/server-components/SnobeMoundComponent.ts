import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SnobeMoundComponentData {}

export interface SnobeMoundComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snobeMound, typeof SnobeMoundComponentArray> {}
}

export const SnobeMoundComponentArray = registerServerComponentArray(
   ServerComponentType.snobeMound,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SnobeMoundComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): SnobeMoundComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         1,
         0,
         0, 0,
         TextureIndex.entities_snobeMound_snobeMound
      )
   );
}

function createComponent(): SnobeMoundComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}