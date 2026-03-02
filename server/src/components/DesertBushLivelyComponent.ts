import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class DesertBushLivelyComponent {}

export const DesertBushLivelyComponentArray = new ComponentArray<DesertBushLivelyComponent>(ServerComponentType.desertBushLively, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}