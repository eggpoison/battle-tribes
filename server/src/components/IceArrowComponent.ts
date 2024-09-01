import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface IceArrowComponentParams {}

export class IceArrowComponent implements IceArrowComponentParams {}

export const IceArrowComponentArray = new ComponentArray<IceArrowComponent>(ServerComponentType.iceArrow, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}