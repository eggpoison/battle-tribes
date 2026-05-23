import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class BallistaComponent {}

export const BallistaComponentArray = new ComponentArray<BallistaComponent>(ServerComponentType.ballista, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}