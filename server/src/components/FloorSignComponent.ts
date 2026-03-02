import { ServerComponentType } from "../../../shared/src/components";
import { Entity } from "../../../shared/src/entities";
import { getStringLengthBytes, Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

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