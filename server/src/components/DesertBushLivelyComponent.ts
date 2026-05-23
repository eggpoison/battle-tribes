import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class DesertBushLivelyComponent {}

export const DesertBushLivelyComponentArray = new ComponentArray<DesertBushLivelyComponent>(ServerComponentType.desertBushLively, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}