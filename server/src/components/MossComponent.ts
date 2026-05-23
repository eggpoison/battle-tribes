import { ServerComponentType, Entity, Packet, randInt } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class MossComponent {
   public readonly size = randInt(0, 2);
   public readonly colour: number;

   constructor(size: number, colour: number) {
      this.size = size;
      this.colour = colour;
   }
}

export const MossComponentArray = new ComponentArray<MossComponent>(ServerComponentType.moss, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const mossComponent = MossComponentArray.getComponent(entity);
   packet.writeNumber(mossComponent.size);
   packet.writeNumber(mossComponent.colour);
}