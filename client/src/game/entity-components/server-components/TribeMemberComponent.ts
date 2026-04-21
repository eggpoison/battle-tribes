import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityComponentData } from "../../world";
import ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData } from "../../entity-component-types";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface TribeMemberComponentData {
   readonly name: string;
}

export interface TribeMemberComponent {
   name: string;
}

class _TribeMemberComponentArray extends ServerComponentArray<TribeMemberComponent, TribeMemberComponentData> {
   public decodeData(reader: PacketReader): TribeMemberComponentData {
      const name = reader.readString();
      return {
         name: name
      };
   }

   public createComponent(entityComponentData: EntityComponentData): TribeMemberComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const tribeMemberComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.tribeMember);
      return {
         name: tribeMemberComponentData.name
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }

   public updateFromData(data: TribeMemberComponentData, entity: Entity): void {
      const tribeMemberComponent = TribeMemberComponentArray.getComponent(entity);
      tribeMemberComponent.name = data.name;
   }
}

export const TribeMemberComponentArray = registerServerComponentArray(ServerComponentType.tribeMember, _TribeMemberComponentArray, true);

export function createTribeMemberComponentData(): TribeMemberComponentData {
   return {
      name: ""
   };
}