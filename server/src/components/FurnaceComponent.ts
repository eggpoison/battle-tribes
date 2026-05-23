import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class FurnaceComponent {}

export const FurnaceComponentArray = new ComponentArray<FurnaceComponent>(ServerComponentType.furnace, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}