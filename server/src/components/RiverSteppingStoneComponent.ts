import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class RiverSteppingStoneComponent {}

export const RiverSteppingStoneComponentArray = new ComponentArray<RiverSteppingStoneComponent>(ServerComponentType.riverSteppingStone, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}