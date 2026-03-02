import { ServerComponentType } from "battletribes-shared/components";
import { randInt } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { Entity } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export class BoulderComponent {
   public readonly boulderType = randInt(0, 1);
}

export const BoulderComponentArray = new ComponentArray<BoulderComponent>(ServerComponentType.boulder, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const boulderComponent = BoulderComponentArray.getComponent(entity);

   packet.writeNumber(boulderComponent.boulderType);
}