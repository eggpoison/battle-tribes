import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class DesertSmallWeedComponent {}

export const DesertSmallWeedComponentArray = new ComponentArray<DesertSmallWeedComponent>(ServerComponentType.desertSmallWeed, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}