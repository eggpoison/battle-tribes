import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { ComponentArray } from "./ComponentArray.js";

export class BarrelComponent {
   public openers: Entity[] = [];
}

export const BarrelComponentArray = new ComponentArray<BarrelComponent>(ServerComponentType.barrel, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, barrel: Entity): void {
   const barrelComponent = BarrelComponentArray.getComponent(barrel);

   packet.writeBool(barrelComponent.openers.length > 0);
}