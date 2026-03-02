import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class PalmTreeComponent {}

export const PalmTreeComponentArray = new ComponentArray<PalmTreeComponent>(ServerComponentType.palmTree, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}