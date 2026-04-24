import { Entity, PacketReader, ItemType, ServerComponentType } from "webgl-test-shared";
import { createDeepFrostHeartBloodParticles } from "../../particles";
import { TransformComponentArray } from "./TransformComponent";
import _ServerComponentArray from "../ServerComponentArray";
import CLIENT_ITEM_INFO_RECORD from "../../client-item-info";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface ItemComponentData {
   readonly itemType: ItemType;
}

export interface ItemComponent {
   readonly itemType: ItemType;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.item, _ItemComponentArray> {}
}

class _ItemComponentArray extends _ServerComponentArray<ItemComponent, ItemComponentData> {
   public decodeData(reader: PacketReader): ItemComponentData {
      const itemType = reader.readNumber();
      return {
         itemType: itemType
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
   }

   public createComponent(entityComponentData: EntityComponentData): ItemComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const itemComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.item);

      return {
         itemType: itemComponentData.itemType
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public onTick(entity: Entity): void {
      const itemComponent = ItemComponentArray.getComponent(entity);
      
      // Make the deep frost heart item spew blue blood particles
      if (itemComponent.itemType === ItemType.deepfrost_heart) {
         const transformComponent = TransformComponentArray.getComponent(entity);
         const hitbox = transformComponent.hitboxes[0];
         createDeepFrostHeartBloodParticles(hitbox.box.position.x, hitbox.box.position.y, 0, 0);
      }
   }
}

export const ItemComponentArray = registerServerComponentArray(ServerComponentType.item, _ItemComponentArray, true);