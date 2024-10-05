import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";

export class PunjiSticksComponent {}

export const PunjiSticksComponentArray = new ComponentArray<PunjiSticksComponent>(ServerComponentType.punjiSticks, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}