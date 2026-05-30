import { Packet, Entity, ServerComponentType } from "battletribes-shared";
import { Bytes } from "../../../shared/src/constants.js";
import { ComponentArray } from "./ComponentArray.js";

export class DesertBushSandyComponent {
   public readonly size: number;
   
   constructor(size: number) {
      this.size = size;
   }
}

export const DesertBushSandyComponentArray = new ComponentArray<DesertBushSandyComponent>(ServerComponentType.desertBushSandy, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return Bytes.Float32;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const desertBushSandyComponent = DesertBushSandyComponentArray.getComponent(entity);
   packet.writeNumber(desertBushSandyComponent.size);
}