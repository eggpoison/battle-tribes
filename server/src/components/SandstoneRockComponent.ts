import { ServerComponentType, Entity, Packet } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class SandstoneRockComponent {
   public readonly size: number;

   constructor(size: number) {
      this.size = size;
   }
}

export const SandstoneRockComponentArray = new ComponentArray<SandstoneRockComponent>(ServerComponentType.sandstoneRock, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const sandstoneRockComponent = SandstoneRockComponentArray.getComponent(entity);
   packet.writeNumber(sandstoneRockComponent.size);
}