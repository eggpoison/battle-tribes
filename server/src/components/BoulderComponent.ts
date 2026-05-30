import { Packet, Entity, ServerComponentType, randInt } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";

export class BoulderComponent {
   public readonly boulderType = randInt(0, 1);
}

export const BoulderComponentArray = new ComponentArray<BoulderComponent>(ServerComponentType.boulder, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const boulderComponent = BoulderComponentArray.getComponent(entity);

   packet.writeNumber(boulderComponent.boulderType);
}