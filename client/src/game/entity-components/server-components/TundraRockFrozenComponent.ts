import { ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tundraRockFrozenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRockFrozen);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex("entities/tundra-rock-frozen/rock-" + (tundraRockFrozenComponentData.variant + 1) + ".png")
   )
   if (tundraRockFrozenComponentData.variant === 0) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentData.variant === 1) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentData.variant === 2) {
      renderPart.angle = -Math.PI * 0.08;
   }
   renderObject.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): TundraRockFrozenComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tundraRockFrozenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRockFrozen);
   return {
      variant: tundraRockFrozenComponentData.variant
   };
}

function getMaxRenderParts(): number {
   return 1;
}