import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { randInt } from "../../../shared/dist/utils.js";
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
   return 2 * Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const mossComponent = MossComponentArray.getComponent(entity);
   packet.writeNumber(mossComponent.size);
   packet.writeNumber(mossComponent.colour);
}