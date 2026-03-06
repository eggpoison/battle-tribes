import { ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getTransformComponentData } from "../../networking/packet-snapshots";

export interface AutomatonAssemblerComponentData {}

interface IntermediateInfo {}

export interface AutomatonAssemblerComponent {}

export const AutomatonAssemblerComponentArray = new ServerComponentArray<AutomatonAssemblerComponent, AutomatonAssemblerComponentData, IntermediateInfo>(ServerComponentType.automatonAssembler, true, createComponent, getMaxRenderParts, decodeData);
AutomatonAssemblerComponentArray.populateIntermediateInfo = populateIntermediateInfo;

export function createAutomatonAssemblerComponentData(): AutomatonAssemblerComponentData {
   return {};
}

function decodeData(): AutomatonAssemblerComponentData {
   return {};
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         2,
         0,
         getTextureArrayIndex("entities/automaton-assembler/automaton-assembler.png")
      )
   );

   renderInfo.attachRenderPart(
      new TexturedRenderPart(
         hitbox,
         0,
         0,
         getTextureArrayIndex("entities/automaton-assembler/back.png")
      )
   );

   // Gear 1
   const gearRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      Math.PI / 4,
      getTextureArrayIndex("entities/automaton-assembler/gear.png")
   );
   gearRenderPart.offset.y = 28;
   gearRenderPart.offset.x = -64;
   renderInfo.attachRenderPart(gearRenderPart);

   // Gear 2
   const gear2RenderPart = new TexturedRenderPart(
      hitbox,
      1.5,
      Math.PI / 8,
      getTextureArrayIndex("entities/automaton-assembler/gear-2.png")
   );
   gear2RenderPart.offset.y = 28;
   gear2RenderPart.offset.x = -24;
   renderInfo.attachRenderPart(gear2RenderPart);

   // Bottom gear
   const bottomGearRenderPart = new TexturedRenderPart(
      hitbox,
      1,
      -Math.PI / 8,
      getTextureArrayIndex("entities/automaton-assembler/gear.png")
   );
   bottomGearRenderPart.offset.y = -32;
   bottomGearRenderPart.offset.x = 20;
   renderInfo.attachRenderPart(bottomGearRenderPart);

   return {};
}

function createComponent(): AutomatonAssemblerComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 5;
}