import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface TundraRockComponentData {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface TundraRockComponent {
   readonly variant: number;
}

export const TundraRockComponentArray = new ServerComponentArray<TundraRockComponent, TundraRockComponentData, IntermediateInfo>(ServerComponentType.tundraRock, true, createComponent, getMaxRenderParts, decodeData);
TundraRockComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): TundraRockComponentData {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const tundraRockComponentData = entityComponentData.serverComponentData[ServerComponentType.tundraRock]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tundra-rock/rock-" + (tundraRockComponentData.variant + 1) + ".png")
   )
   if (tundraRockComponentData.variant === 0) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockComponentData.variant === 1) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockComponentData.variant === 2) {
      renderPart.angle = -Math.PI * 0.08;
   }
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TundraRockComponent {
   return {
      variant: entityComponentData.serverComponentData[ServerComponentType.tundraRock]!.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}