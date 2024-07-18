import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface HutComponentParams {}

export class HutComponent {
   public lastDoorSwingTicks = 0;

   public hasSpawnedTribesman = false;
   public hasTribesman = false;
   public isRecalling = false;
}

export const HutComponentArray = new ComponentArray<HutComponent>(ServerComponentType.hut, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 3 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const hutComponent = HutComponentArray.getComponent(entity);

   packet.addNumber(hutComponent.lastDoorSwingTicks);
   packet.addBoolean(hutComponent.isRecalling);
   packet.padOffset(3)
}