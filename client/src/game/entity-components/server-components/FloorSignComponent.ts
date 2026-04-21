import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

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

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex("entities/floor-sign/floor-sign.png")
   );
   renderObject.attachRenderPart(renderPart);
   
   return {};
}

function createComponent(entityComponentData: EntityComponentData): FloorSignComponentData {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const floorSignComponent = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.floorSign);
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