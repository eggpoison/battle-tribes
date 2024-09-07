import { TribesmanTitle } from "webgl-test-shared/dist/titles";
import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";
import { getPlayerClientFromInstanceID } from "../server/player-clients";
import { sendRespawnDataPacket } from "../server/packet-processing";

export interface PlayerComponentParams {
   username: string;
}

export class PlayerComponent {
   public readonly username: string;
   
   /** ID of the tribesman the player is interacting with */
   public interactingEntityID = 0;

   public titleOffer: TribesmanTitle | null = null;

   constructor(params: PlayerComponentParams) {
      this.username = params.username;
   }
}

export const PlayerComponentArray = new ComponentArray<PlayerComponent>(ServerComponentType.player, true, {
   onJoin: onJoin,
   onRemove: onRemove,
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function onJoin(player: EntityID): void {
   const playerClient = getPlayerClientFromInstanceID(player);
   if (playerClient !== null && !playerClient.isAlive) {
      sendRespawnDataPacket(playerClient);
      playerClient.isAlive = true;
   }
}

function onRemove(player: EntityID): void {
   const playerClient = getPlayerClientFromInstanceID(player);
   if (playerClient !== null) {
      playerClient.isAlive = false;
   }
}

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT + 100;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const playerComponent = PlayerComponentArray.getComponent(entity);

   // @Hack: hardcoded
   packet.addString(playerComponent.username, 100);
}