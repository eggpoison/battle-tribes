import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";
import { randFloat } from "webgl-test-shared/dist/utils";

export interface IceShardComponentParams {}

export class IceShardComponent {
   public readonly lifetime = randFloat(0.1, 0.2);
}

export const IceShardComponentArray = new ComponentArray<IceShardComponent>(ServerComponentType.iceShard, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}