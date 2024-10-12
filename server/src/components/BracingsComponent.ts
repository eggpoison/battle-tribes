import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";

export class BracingsComponent {

}

export const BracingsComponentArray = new ComponentArray<BracingsComponent>(ServerComponentType.bracings, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(_entity: EntityID): number {

   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {}