import { ServerComponentType, Entity, Packet } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class TundraRockComponent {
   public readonly variant: number;
   
   constructor(variant: number) {
      this.variant = variant;
   }
}

export const TundraRockComponentArray = new ComponentArray<TundraRockComponent>(ServerComponentType.tundraRock, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tundraRockComponent = TundraRockComponentArray.getComponent(entity);
   packet.writeNumber(tundraRockComponent.variant);
}