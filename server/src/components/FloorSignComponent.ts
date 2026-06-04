import { ServerComponentType } from "../../../shared/dist/components.js";
import { Entity } from "../../../shared/dist/entities.js";
import { getStringLengthBytes, Packet } from "../../../shared/dist/packets.js";
import { ComponentArray } from "./ComponentArray.js";

export class FloorSignComponent {
   public message = "";
}

export const FloorSignComponentArray = new ComponentArray<FloorSignComponent>(ServerComponentType.floorSign, true, getDataLength, addDataToPacket);

function getDataLength(entity: Entity): number {
   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   return getStringLengthBytes(floorSignComponent.message);
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const floorSignComponent = FloorSignComponentArray.getComponent(entity);
   packet.writeString(floorSignComponent.message);
}