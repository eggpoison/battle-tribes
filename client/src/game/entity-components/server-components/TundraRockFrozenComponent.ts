import { ServerComponentType } from "../../../../../shared/src/components";
import { PacketReader } from "../../../../../shared/src/packets";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";
import ServerComponentArray from "../ServerComponentArray";

export interface TundraRockFrozenComponentData {
   readonly variant: number;
}

export interface TundraRockFrozenComponent {
   readonly variant: number;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tundraRockFrozen, typeof TundraRockFrozenComponentArray> {}
}

export const TundraRockFrozenComponentArray = registerServerComponentArray(
   ServerComponentType.tundraRockFrozen,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
TundraRockFrozenComponentArray.populateIntermediateInfo = populateIntermediateInfo;

function decodeData(reader: PacketReader): TundraRockFrozenComponentData {
   const variant = reader.readNumber();
   return {
      variant: variant
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const tundraRockFrozenComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tundraRockFrozen);
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      TextureIndex.entities_tundraRockFrozen_rock1 + tundraRockFrozenComponentData.variant
   );
   if (tundraRockFrozenComponentData.variant === 0) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentData.variant === 1) {
      renderPart.angle = -Math.PI * 0.25;
   } else if (tundraRockFrozenComponentData.variant === 2) {
      renderPart.angle = -Math.PI * 0.08;
   }
   renderObject.attachRenderPart(renderPart);
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