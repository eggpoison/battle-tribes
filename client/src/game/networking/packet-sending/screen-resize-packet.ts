import { Packet, PacketType } from "../../../../../shared/src";
import { sendData } from "../networking";

/*///////////////

Packet type
 - 1 float || 4 bytes
Width, height
 - 2 floats || 8 bytes + 4 = 12

TOTAL = 12 BYTES (aligned)

*////////////////

export function sendScreenResizePacket() {
   const packet = new Packet(PacketType.screenResize, 12);
   packet.writeNumber(window.innerWidth);
   packet.writeNumber(window.innerHeight);
   sendData(packet.buffer);
}