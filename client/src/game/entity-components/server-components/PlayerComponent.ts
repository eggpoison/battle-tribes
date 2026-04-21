import { ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../entity-component-types";
import { registerServerComponentArray } from "../component-register";

export interface PlayerComponentData {
   readonly username: string;
}

export interface PlayerComponent {
   readonly username: string;
}

class _PlayerComponentArray extends ServerComponentArray<PlayerComponent, PlayerComponentData> {
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