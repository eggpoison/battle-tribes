import { ServerComponentType, PacketReader } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";
import { getEntityServerComponentTypes } from "../../entity-component-types";
import { getServerComponentData } from "../../entity-component-types";

export interface PlayerComponentData {
   readonly username: string;
}

export interface PlayerComponent {
   readonly username: string;
}

export const PlayerComponentArray = new ServerComponentArray<PlayerComponent, PlayerComponentData, never>(ServerComponentType.player, true, createComponent, getMaxRenderParts, decodeData);

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