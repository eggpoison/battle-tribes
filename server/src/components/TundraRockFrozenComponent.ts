import { ServerComponentType, Entity, Packet } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";

export class TundraRockFrozenComponent {
   public readonly variant: number;
   
   constructor(variant: number) {
      this.variant = variant;
   }
}

export const TundraRockFrozenComponentArray = new ComponentArray<TundraRockFrozenComponent>(ServerComponentType.tundraRockFrozen, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const tundraRockFrozenComponent = TundraRockFrozenComponentArray.getComponent(entity);
   packet.writeNumber(tundraRockFrozenComponent.variant);
}