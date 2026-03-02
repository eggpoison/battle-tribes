import { Entity } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { ComponentArray } from "./ComponentArray";
import { ServerComponentType } from "battletribes-shared/components";

export class SnowberryBushComponent {
   public readonly isFertile: boolean;
   public numBerries: number;

   constructor() {
      this.isFertile = Math.random() < 0.5;
      this.numBerries = this.isFertile ? 3 : 0;
   }
}

export const SnowberryBushComponentArray = new ComponentArray<SnowberryBushComponent>(ServerComponentType.snowberryBush, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, snowberryBush: Entity): void {
   const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);
   packet.writeNumber(snowberryBushComponent.numBerries);
}