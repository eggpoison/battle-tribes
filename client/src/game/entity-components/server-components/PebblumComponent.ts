import { ServerComponentType } from "../../../../../shared/src/components";
import { randAngle } from "../../../../../shared/src/utils";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface PebblumComponentData {}

export interface PebblumComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.pebblum, typeof PebblumComponentArray> {}
}

export const PebblumComponentArray = registerServerComponentArray(
   ServerComponentType.pebblum,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
PebblumComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): PebblumComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   // Nose
   const nose = new TexturedRenderPart(
      hitbox,
      0,
      randAngle(),
      0, 12,
      TextureIndex.entities_pebblum_pebblumNose
   )
   renderObject.attachRenderPart(nose);

   // Body
   const body = new TexturedRenderPart(
      hitbox,
      1,
      randAngle(),
      0, -8,
      TextureIndex.entities_pebblum_pebblumBody
   )
   renderObject.attachRenderPart(body);
}

function createComponent(): PebblumComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 2;
}