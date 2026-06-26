import { ServerComponentType } from "../../../../../shared/src/components";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface AutomatonAssemblerComponentData {}

export interface AutomatonAssemblerComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.automatonAssembler, typeof AutomatonAssemblerComponentArray> {}
}

export const AutomatonAssemblerComponentArray = registerServerComponentArray(
   ServerComponentType.automatonAssembler,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
AutomatonAssemblerComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(): AutomatonAssemblerComponentData {
   return {};
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         2,
         0,
         0, 0,
         TextureIndex.entities_automatonAssembler_automatonAssembler
      )
   );

   renderObject.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         0, 0,
         TextureIndex.entities_automatonAssembler_back
      )
   );

   // Gear 1
   const gearRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      Math.PI / 4,
      -64, 28,
      TextureIndex.entities_automatonAssembler_gear
   );
   renderObject.attachRenderPart(gearRenderPart);

   // Gear 2
   const gear2RenderPart = new TexturedRenderPart(
      hitbox,
      1.5,
      Math.PI / 8,
      -24, 28,
      TextureIndex.entities_automatonAssembler_gear2
   );
   renderObject.attachRenderPart(gear2RenderPart);

   // Bottom gear
   const bottomGearRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      -Math.PI / 8,
      20, -32,
      TextureIndex.entities_automatonAssembler_gear
   );
   renderObject.attachRenderPart(bottomGearRenderPart);
}

function createComponent(): AutomatonAssemblerComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 5;
}

export function createAutomatonAssemblerComponentData(): AutomatonAssemblerComponentData {
   return {};
}