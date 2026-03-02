// @Incomplete: why do we have this component?

import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";

export class FenceComponent {}

export const FenceComponentArray = new ComponentArray<FenceComponent>(ServerComponentType.fence, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}