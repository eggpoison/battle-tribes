import { Entity, PacketReader, ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import { getServerComponentData, getTransformComponentData } from "../../networking/packet-snapshots";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface SnowberryBushComponentData {
   readonly numBerries: number;
}

interface IntermediateInfo {
   readonly renderPart: TexturedRenderPart;
}

export interface SnowberryBushComponent {
   readonly renderPart: TexturedRenderPart;
}

export const SnowberryBushComponentArray = new ServerComponentArray<SnowberryBushComponent, SnowberryBushComponentData, IntermediateInfo>(ServerComponentType.snowberryBush, true, createComponent, getMaxRenderParts, decodeData);
SnowberryBushComponentArray.populateIntermediateInfo = populateIntermediateInfo;
SnowberryBushComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): SnowberryBushComponentData {
   const numBerries = reader.readNumber();
   return {
      numBerries: numBerries
   };
}

const getTextureSource = (numBerries: number): string => {
   return "entities/snowberry-bush/stage-" + numBerries + ".png";
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const snowberryBushComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.snowberryBush);

   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(getTextureSource(snowberryBushComponentData.numBerries))
   )
   renderInfo.attachRenderPart(renderPart);

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
   snowberryBushComponent.renderPart.switchTextureSource(getTextureSource(numBerries));
}