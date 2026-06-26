import { ServerComponentType } from "../../../../../shared/src/components";
import { PacketReader } from "../../../../../shared/src/packets";
import ServerComponentArray from "../ServerComponentArray";
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
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.player, typeof PlayerComponentArray> {}
}

export const PlayerComponentArray = registerServerComponentArray(
   ServerComponentType.player,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(reader: PacketReader): PlayerComponentData {
   const username = reader.readString();
   return {
      username: username
   };
}

function createComponent(entityComponentData: EntityComponentData): PlayerComponent {
   const serverComponentTypes = getEntityServerComponentTypes(entityComponentData.entityType);
   const playerComponentData = getServerComponentData(entityComponentData.serverComponentData, serverComponentTypes, ServerComponentType.player);
   return {
      username: playerComponentData.username
   };
}

function getMaxRenderParts(): number {
   return 0;
}