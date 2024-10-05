import { TribesmanTitle } from "battletribes-shared/titles";
import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";
import { getPlayerClientFromInstanceID } from "../server/player-clients";
import { sendRespawnDataPacket } from "../server/packet-processing";

export class PlayerComponent {
   public readonly username: string;
   
   /** ID of the tribesman the player is interacting with */
   public interactingEntityID = 0;

   public titleOffer: TribesmanTitle | null = null;

   constructor(username: string) {
      this.username = username;
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