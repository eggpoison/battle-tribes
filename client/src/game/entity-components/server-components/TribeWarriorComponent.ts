import { Entity, ServerComponentType, PacketReader, ScarInfo } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { getTextureArrayIndex } from "../../texture-atlases";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TribeWarriorComponentData {
   readonly scars: Array<ScarInfo>;
}

export interface TribeWarriorComponent {
   readonly scars: Array<ScarInfo>;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tribeWarrior, _TribeWarriorComponentArray> {}
}

class _TribeWarriorComponentArray extends _ServerComponentArray<TribeWarriorComponent, TribeWarriorComponentData> {
   public decodeData(reader: PacketReader): TribeWarriorComponentData {
      const scars: Array<ScarInfo> = [];
      const numScars = reader.readNumber();
      for (let i = 0; i < numScars; i++) {
         const offsetX = reader.readNumber();
         const offsetY = reader.readNumber();
         const rotation = reader.readNumber();
         const type = reader.readNumber();

         scars.push({
            offsetX: offsetX,
            offsetY: offsetY,
            rotation: rotation,
            type: type
         });
      }

      return {
         scars: scars
      };
   }

   public populateIntermediateInfo(renderObject: EntityRenderObject, entityComponentData: EntityComponentData): void {
      const transformComponentData = getTransformComponentData(entityComponentData.serverComponentData);
      const hitbox = transformComponentData.hitboxes[0];
      
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tribeWarriorComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribeWarrior);
      for (let i = 0; i < tribeWarriorComponentData.scars.length; i++) {
         const scarInfo = tribeWarriorComponentData.scars[i];

         const renderPart = new TexturedRenderPart(
            hitbox,
            2.5,
            scarInfo.rotation,
            scarInfo.offsetX, scarInfo.offsetY,
            getTextureArrayIndex("scars/scar-" + (scarInfo.type + 1) + ".png")
         );

         renderObject.attachRenderPart(renderPart);
      }
   }

   public createComponent(entityComponentData: EntityComponentData): TribeWarriorComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tribeWarriorComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribeWarrior);
      return {
         scars: tribeWarriorComponentData.scars
      };
   }

   public getMaxRenderParts(entityComponentData: EntityComponentData): number {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tribeWarriorComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribeWarrior);
      return tribeWarriorComponentData.scars.length;
   }

   public updateFromData(data: TribeWarriorComponentData, entity: Entity): void {
      const tribeWarriorComponent = TribeWarriorComponentArray.getComponent(entity);
      for (let i = tribeWarriorComponent.scars.length; i < data.scars.length; i++) {
         tribeWarriorComponent.scars.push(data.scars[i]);
      }
   }
}

export const TribeWarriorComponentArray = registerServerComponentArray(ServerComponentType.tribeWarrior, _TribeWarriorComponentArray, true);