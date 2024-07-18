import { ServerComponentType } from "webgl-test-shared/dist/components";
import { SLIMEWISP_MERGE_TIME } from "../entities/mobs/slimewisp";
import { ComponentArray } from "./ComponentArray";

export interface SlimewispComponentParams {}

export class SlimewispComponent {
   public mergeTimer = SLIMEWISP_MERGE_TIME;
}

export const SlimewispComponentArray = new ComponentArray<SlimewispComponent>(ServerComponentType.slimewisp, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}