import { ServerComponentType, Entity, Packet } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class HutComponent {
   public lastDoorSwingTicks = 0;

   public hasSpawnedTribesman = false;
   public hasTribesman = false;
   public isRecalling = false;
}

export const HutComponentArray = new ComponentArray<HutComponent>(ServerComponentType.hut, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: Entity): void {
   const hutComponent = HutComponentArray.getComponent(entity);
   packet.writeNumber(hutComponent.lastDoorSwingTicks);
   packet.writeBool(hutComponent.isRecalling);
}