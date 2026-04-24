import { ServerComponentType, PacketReader } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { getEntityServerComponentTypes } from "../component-types";
import { getServerComponentData } from "../component-types";
import { registerServerComponentArray } from "../component-registry";

export interface PlayerComponentData {
   readonly username: string;
}

export interface PlayerComponent {
   readonly username: string;
}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.player, _PlayerComponentArray> {}
}

class _PlayerComponentArray extends _ServerComponentArray<PlayerComponent, PlayerComponentData> {
   public decodeData(reader: PacketReader): PlayerComponentData {
      const username = reader.readString();
      return {
         username: username
      };
   }

   public createComponent(entityComponentData: EntityComponentData): PlayerComponent {
      const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
      const playerComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.player);
      return {
         username: playerComponentData.username
      };
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const PlayerComponentArray = registerServerComponentArray(ServerComponentType.player, _PlayerComponentArray, true);