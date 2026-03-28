import { Entity, PacketReader, ItemType, ServerComponentType } from "webgl-test-shared";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";

export interface ItemComponentData {
   readonly itemType: ItemType;
}

interface IntermediateInfo {}

export interface ItemComponent {
   readonly itemType: ItemType;
}

export const ItemComponentArray = new ServerComponentArray<ItemComponent, ItemComponentData, IntermediateInfo>(ServerComponentType.item, true, createComponent, getMaxRenderParts, decodeData);
ItemComponentArray.populateIntermediateInfo = populateIntermediateInfo;
ItemComponentArray.onTick = onTick;

function decodeData(reader: PacketReader): ItemComponentData {
   const itemType = reader.readNumber();
   return {
      itemType: itemType
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const itemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.item);
      
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentData.itemType].entityTextureSource)
   )
   renderObject.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): ItemComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const itemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.item);

   return {
      itemType: itemComponentData.itemType
   };
}

function getMaxRenderParts(): number {
   return 1;
}

function onTick(entity: Entity): void {
   const itemComponent = ItemComponentArray.getComponent(entity);
   
   // Make the deep frost heart item spew blue blood particles
   if (itemComponent.itemType === ItemType.deepfrost_heart) {
      const transformComponent = TransformComponentArray.getComponent(entity);
      const hitbox = transformComponent.hitboxes[0];
      createDeepFrostHeartBloodParticles(hitbox.box.position.x, hitbox.box.position.y, 0, 0);
   }
}