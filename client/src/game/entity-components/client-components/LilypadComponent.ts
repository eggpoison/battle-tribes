import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { ClientComponentType } from "../client-component-types";
import ClientComponentArray from "../ClientComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerClientComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface LilypadComponentData {}

export interface LilypadComponent {}

declare module "../component-registry" {
   interface ClientComponentRegistry extends RegisterClientComponent<ClientComponentType.lilypad, typeof LilypadComponentArray> {}
}

export const LilypadComponentArray = registerClientComponentArray(
   ClientComponentType.lilypad,
   new ClientComponentArray(true, createComponent, getMaxRenderParts)
);
LilypadComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_lilypad_lilypad
      )
   );
}

function createComponent(): LilypadComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 1;
}

export function createLilypadComponentData(): LilypadComponentData {
   return {};
}