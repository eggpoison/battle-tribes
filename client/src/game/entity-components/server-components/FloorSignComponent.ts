import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface FloorSignComponentData {
   readonly message: string;
}

export interface FloorSignComponent {
   message: string;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.floorSign, typeof FloorSignComponentArray> {}
}

export const FloorSignComponentArray = registerServerComponentArray(
   ServerComponentType.floorSign,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
FloorSignComponentArray.populateIntermediateInfo = populateIntermediateInfo;
FloorSignComponentArray.updateFromData = updateFromData;

function decodeData(reader: PacketReader): FloorSignComponentData {
   const message = reader.readString();
   return {
      message: message
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];
   
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      TextureIndex.entities_floorSign_floorSign
   );
   renderObject.attachRenderPart(renderPart);
}

function createComponent(entityComponentData: EntityComponentData): FloorSignComponent {
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