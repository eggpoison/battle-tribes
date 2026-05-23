import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class RiverSteppingStoneComponent {}

export const RiverSteppingStoneComponentArray = new ComponentArray<RiverSteppingStoneComponent>(ServerComponentType.riverSteppingStone, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}