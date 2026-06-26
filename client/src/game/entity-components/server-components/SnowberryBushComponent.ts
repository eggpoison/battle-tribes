import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface SnowberryBushComponentData {
   readonly numBerries: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface SnowberryBushComponent {
   readonly renderPart: TexturedRenderPart;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.snowberryBush, typeof SnowberryBushComponentArray> {}
}

export const SnowberryBushComponentArray = registerServerComponentArray(
   ServerComponentType.snowberryBush,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
SnowberryBushComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SnowberryBushComponentArray.updateFromData = updateFromData;

const getTextureIndex = (numBerries: number): TextureIndex => {
   return TextureIndex.entities_snowberryBush_stage0 + numBerries;
}

function decodeData(reader: PacketReader): SnowberryBushComponentData {
   const numBerries = reader.readNumber();
   return {
      numBerries: numBerries
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const snowberryBushComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.snowberryBush);

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureIndex(snowberryBushComponentData.numBerries)
   )
   renderObject.attachRenderPart(renderPart);

   return {
      renderPart: renderPart
   };
}

function createComponent(_entityComponentData: EntityComponentData, intermediateInfo: IntermediateInfo): SnowberryBushComponent {
   return {
      renderPart: intermediateInfo.renderPart
   };
}

function getMaxRenderParts(): number {
   return 1;
}
   
function updateFromData(data: SnowberryBushComponentData, snowberryBush: Entity): void {
   const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);

   const numBerries = data.numBerries;
   snowberryBushComponent.renderPart.switchTextureSource(getTextureIndex(numBerries));
}