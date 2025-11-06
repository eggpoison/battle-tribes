import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderInfo } from "../../EntityRenderInfo";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";

export interface FloorSignComponentData {
   readonly message: string;
}

interface IntermediateInfo {}

export interface FloorSignComponent {
   message: string;
}

export const FloorSignComponentArray = new ServerComponentArray<FloorSignComponent, FloorSignComponentData, IntermediateInfo>(ServerComponentType.floorSign, true, createComponent, getMaxRenderParts, decodeData);
FloorSignComponentArray.populateIntermediateInfo = populateIntermediateInfo;
FloorSignComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): FloorSignComponentData {
   const message = reader.readString();
   return {
      message: message
   };
}

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData[ServerComponentType.transform]!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex("entities/floor-sign/floor-sign.png")
   );
   renderInfo.attachRenderPart(renderPart);
   
   return {};
}

function createComponent(entityComponentData: EntityComponentData): FloorSignComponentData {
   const floorSignComponent = entityComponentData.serverComponentData[ServerComponentType.floorSign]!;
   
   return {
      message: floorSignComponent.message
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function updateFromData(data: FloorSignComponent, entity: Entity): void {
   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   floorSignComponent.message = data.message;
}