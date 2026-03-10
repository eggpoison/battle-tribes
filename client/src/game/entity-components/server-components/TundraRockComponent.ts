import { ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

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
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tundraRockComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRock);
   
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
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tundraRockComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRock);
   return {
      variant: tundraRockComponentData.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}