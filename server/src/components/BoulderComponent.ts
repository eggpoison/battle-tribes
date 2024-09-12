import { BoulderComponentData, ServerComponentType } from "battletribes-shared/components";
import { randInt } from "battletribes-shared/utils";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "battletribes-shared/entities";
import { Packet } from "battletribes-shared/packets";

export interface BoulderComponentParams {}

export class BoulderComponent {
   public readonly boulderType = randInt(0, 1);
}

export const BoulderComponentArray = new ComponentArray<BoulderComponent>(ServerComponentType.boulder, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const boulderComponent = BoulderComponentArray.getComponent(entity);

   packet.addNumber(boulderComponent.boulderType);
}