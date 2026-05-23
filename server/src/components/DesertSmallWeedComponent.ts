import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class DesertSmallWeedComponent {}

export const DesertSmallWeedComponentArray = new ComponentArray<DesertSmallWeedComponent>(ServerComponentType.desertSmallWeed, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}