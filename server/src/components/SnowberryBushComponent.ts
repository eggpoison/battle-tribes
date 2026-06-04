import { ServerComponentType } from "../../../shared/dist/components.js";
import { Bytes } from "../../../shared/dist/constants.js";
import { Entity } from "../../../shared/dist/entities.js";
import { Packet } from "../../../shared/dist/packets.js";
import { ComponentArray } from "./ComponentArray.js";

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
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, snowberryBush: Entity): void {
   const snowberryBushComponent = SnowberryBushComponentArray.getComponent(snowberryBush);
   packet.writeNumber(snowberryBushComponent.numBerries);
}