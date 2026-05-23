import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class IceArrowComponent {}

export const IceArrowComponentArray = new ComponentArray<IceArrowComponent>(ServerComponentType.iceArrow, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}