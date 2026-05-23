import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class GlurbBodySegmentComponent {}

export const GlurbBodySegmentComponentArray = new ComponentArray<GlurbBodySegmentComponent>(ServerComponentType.glurbBodySegment, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}