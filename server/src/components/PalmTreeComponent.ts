import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class PalmTreeComponent {}

export const PalmTreeComponentArray = new ComponentArray<PalmTreeComponent>(ServerComponentType.palmTree, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}