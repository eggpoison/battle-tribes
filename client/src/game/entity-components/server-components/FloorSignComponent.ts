import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityRenderObject } from "../../EntityRenderObject";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData, getTransformComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-registry";

export interface FloorSignComponentData {
   readonly message: string;
}

export interface FloorSignComponent {
   message: string;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.floorSign, _FloorSignComponentArray, FloorSignComponentData> {}
}

class _FloorSignComponentArray extends _ServerComponentArray<FloorSignComponent, FloorSignComponentData> {
   public decodeData(reader: PacketReader): FloorSignComponentData {
      const message = reader.readString();
      return {
         message: message
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
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
   }

   public createComponent(entityComponentData: EntityComponentData): FloorSignComponentData {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const floorSignComponent = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.floorSign);
      return {
         message: floorSignComponent.message
      };
   }

   public getMaxRenderParts(): number {
      return 1;
   }

   public updateFromData(data: FloorSignComponent, entity: Entity): void {
      const floorSignComponent = FloorSignComponentArray.getComponent(entity);
      floorSignComponent.message = data.message;
   }
}

export const FloorSignComponentArray = registerServerComponentArray(ServerComponentType.floorSign, _FloorSignComponentArray, true);