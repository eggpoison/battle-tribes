import { PacketReader, Entity, ServerComponentType } from "webgl-test-shared";
import { EntityComponentData } from "../../world";
import _ServerComponentArray from "../ServerComponentArray";
import { getServerComponentData } from "../component-types";
import { getEntityServerComponentTypes } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface TribeMemberComponentData {
   readonly name: string;
}

export interface TribeMemberComponent {
   name: string;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.tribeMember, _TribeMemberComponentArray> {}
}

class _TribeMemberComponentArray extends _ServerComponentArray<TribeMemberComponent, TribeMemberComponentData> {
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