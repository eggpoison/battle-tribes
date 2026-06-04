import { ServerComponentType } from "../../../shared/dist/components.js";
import { ComponentArray } from "./ComponentArray.js";

export class PalmTreeComponent {}

export const PalmTreeComponentArray = new ComponentArray<PalmTreeComponent>(ServerComponentType.palmTree, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}