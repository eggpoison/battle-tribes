import { ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { ItemType } from "../../../../../shared/src/items/items";
import { PacketReader } from "../../../../../shared/src/packets";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import ServerComponentArray from "../ServerComponentArray";

export interface ItemComponentData {
   readonly itemType: ItemType;
}

export interface ItemComponent {
   readonly itemType: ItemType;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.item, typeof ItemComponentArray> {}
}

export const ItemComponentArray = registerServerComponentArray(
   ServerComponentType.item,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);
ItemComponentArray.populateIntermediateInfo = populateIntermediateInfo;
ItemComponentArray.onTick = onTick;

function decodeData(reader: PacketReader): ItemComponentData {
   const itemType = reader.readNumber();
   return {
      itemType: itemType
   };
}

function populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
   const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
   const hitbox = transformComponentData.hitboxes[0];

   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const itemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.item);
      
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      0, 0,
      CLIENT_ITEM_INFO_RECORD[itemComponentData.itemType].entityTextureIndex
   )
   renderObject.attachRenderPart(renderPart);
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
      createDeepFrostHeartBloodParticles(hitbox.box.posX, hitbox.box.posY, 0, 0);
   }
}