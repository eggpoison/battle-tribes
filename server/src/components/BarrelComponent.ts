import { Packet, Entity, ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class BarrelComponent {
   public openers: Array<Entity> = [];
}

export const BarrelComponentArray = new ComponentArray<BarrelComponent>(ServerComponentType.barrel, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, barrel: Entity): void {
   const barrelComponent = BarrelComponentArray.getComponent(barrel);

   packet.writeBool(barrelComponent.openers.length > 0);
}