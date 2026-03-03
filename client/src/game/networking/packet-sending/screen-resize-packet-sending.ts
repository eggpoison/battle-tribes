import { Packet, PacketType } from "../../../../../shared/src";
import { sendData } from "../../client";

/*///////////////

Packet type
 - 1 float || 4 bytes
Width, height
 - 2 floats || 8 bytes + 4 = 12

TOTAL = 12 BYTES (aligned)

*////////////////

export function sendScreenResizePacket() {
   const packet = new Packet(PacketType.playerData, 12);
   packet.writeNumber(window.innerWidth);
   packet.writeNumber(window.innerHeight);
   sendData(packet.buffer);
}