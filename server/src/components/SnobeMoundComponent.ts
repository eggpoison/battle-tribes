import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class SnobeMoundComponent {}

export const SnobeMoundComponentArray = new ComponentArray<SnobeMoundComponent>(ServerComponentType.snobeMound, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}