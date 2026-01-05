import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

export class BarrelComponent {
   public openers = new Array<Entity>();
}

export const BarrelComponentArray = new ComponentArray<BarrelComponent>(ServerComponentType.barrel, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, barrel: Entity): void {
   const barrelComponent = BarrelComponentArray.getComponent(barrel);

   packet.writeBool(barrelComponent.openers.length > 0);
}