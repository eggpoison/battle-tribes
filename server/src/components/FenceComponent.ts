import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

// @Incomplete: why do we have this component?

export class FenceComponent {}

export const FenceComponentArray = new ComponentArray<FenceComponent>(ServerComponentType.fence, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}