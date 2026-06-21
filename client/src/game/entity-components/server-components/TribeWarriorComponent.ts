import { ScarInfo, ServerComponentType } from "../../../../../shared/src/components";
import { Entity } from "../../../../../shared/src/entities";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
import TexturedRenderPart from "../../render-parts/TexturedRenderPart";
import { EntityComponentData } from "../../world";
import { EntityRenderObject } from "../../EntityRenderObject";
import { getServerComponentData, getTransformComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";
import { TextureIndex } from "../../../texture-index";

export interface TribeWarriorComponentData {
   readonly scars: ScarInfo[];
}

export interface TribeWarriorComponent {
   readonly scars: ScarInfo[];
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tribeWarrior, _TribeWarriorComponentArray> {}
}

class _TribeWarriorComponentArray extends ServerComponentArray<TribeWarriorComponent, TribeWarriorComponentData> {
   public decodeData(reader: PacketReader): TribeWarriorComponentData {
      const scars: ScarInfo[] = [];
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
            TextureIndex.scars_scar1 + scarInfo.type
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