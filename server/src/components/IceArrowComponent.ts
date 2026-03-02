import { ServerComponentType } from "battletribes-shared/components";
import { ComponentArray } from "./ComponentArray";

export class IceArrowComponent {}

export const IceArrowComponentArray = new ComponentArray<IceArrowComponent>(ServerComponentType.iceArrow, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}