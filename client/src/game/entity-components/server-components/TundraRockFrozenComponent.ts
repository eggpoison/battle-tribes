import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

export interface TundraRockFrozenComponentData {
   readonly variant: number;
}

interface IntermediateInfo {}

export interface TundraRockFrozenComponent {
   readonly variant: number;
}

export const TundraRockFrozenComponentArray = new ServerComponentArray<TundraRockFrozenComponent, TundraRockFrozenComponentData, IntermediateInfo>(ServerComponentType.tundraRockFrozen, true, createComponent, getMaxRenderParts, decodeData);
TundraRockFrozenComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): TundraRockFrozenComponentData {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];

   const tundraRockFrozenComponentData = entityComponentData.serverComponentData[ServerComponentType.tundraRockFrozen]!;
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/tundra-rock-frozen/rock-" + (tundraRockFrozenComponentData.variant + 1) + ".png")
   )
   if (tundraRockFrozenComponentData.variant === 0) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentData.variant === 1) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentData.variant === 2) {
      renderPart.angle = -Math.PI * 0.08;
   }
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TundraRockFrozenComponent {
   return {
      variant: entityComponentData.serverComponentData[ServerComponentType.tundraRockFrozen]!.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}