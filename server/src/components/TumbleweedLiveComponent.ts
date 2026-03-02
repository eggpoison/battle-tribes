import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class TumbleweedLiveComponent {}

export const TumbleweedLiveComponentArray = new ComponentArray<TumbleweedLiveComponent>(ServerComponentType.tumbleweedLive, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}