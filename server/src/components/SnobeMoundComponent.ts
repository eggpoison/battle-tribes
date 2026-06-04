import { ServerComponentType } from "../../../shared/dist/components.js";
import { ComponentArray } from "./ComponentArray.js";

export class SnobeMoundComponent {}

export const SnobeMoundComponentArray = new ComponentArray<SnobeMoundComponent>(ServerComponentType.snobeMound, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}