import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class BallistaComponent {}

export const BallistaComponentArray = new ComponentArray<BallistaComponent>(ServerComponentType.ballista, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}