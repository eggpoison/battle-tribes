import { PacketReader } from "battletribes-shared/packets";
import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";
import { EntityComponentData } from "../../world";

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
   return {
      username: entityComponentData.serverComponentData[ServerComponentType.player]!.username
   };
}

function getMaxRenderParts(): number {
   return 0;
}