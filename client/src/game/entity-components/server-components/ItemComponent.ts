import { Entity, PacketReader, ItemType, ServerComponentType } from "webgl-test-shared";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import ServerComponentArray from "../ServerComponentArray";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases/texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderInfo } from "../../EntityRenderInfo";

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

function populateIntermediateInfo(renderInfo: EntityRenderInfo, entityComponentData: EntityComponentData): IntermediateInfo {
   const transformComponentData = entityComponentData.serverComponentData.get(ServerComponentType.transform)!;
   const hitbox = transformComponentData.hitboxes[0];
   
   const itemComponentData = entityComponentData.serverComponentData.get(ServerComponentType.item)!;
      
   const renderPart = new TexturedRenderPart(
      hitbox,
      0,
      0,
      getTextureArrayIndex(CLIENT_ITEM_INFO_RECORD[itemComponentData.itemType].entityTextureSource)
   )
   renderInfo.attachRenderPart(renderPart);

   return {};
}

function createComponent(entityComponentData: EntityComponentData): ItemComponent {
   return {
      itemType: entityComponentData.serverComponentData.get(ServerComponentType.item)!.itemType
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