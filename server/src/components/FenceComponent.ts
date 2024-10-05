// @Incomplete: why do we have this component?

import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";

export class FenceComponent {}

export const FenceComponentArray = new ComponentArray<FenceComponent>(ServerComponentType.fence, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}