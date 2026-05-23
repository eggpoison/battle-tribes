import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class TumbleweedLiveComponent {}

export const TumbleweedLiveComponentArray = new ComponentArray<TumbleweedLiveComponent>(ServerComponentType.tumbleweedLive, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}