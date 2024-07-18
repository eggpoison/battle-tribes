import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { EntityID } from "webgl-test-shared/dist/entities";
import { Packet } from "webgl-test-shared/dist/packets";

export interface SpikesComponentParams {}

export class SpikesComponent {
   public isCovered = false;
}

export const SpikesComponentArray = new ComponentArray<SpikesComponent>(ServerComponentType.spikes, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 2 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const spikesComponent = SpikesComponentArray.getComponent(entity);
   packet.addBoolean(spikesComponent.isCovered);
   packet.padOffset(3);
}