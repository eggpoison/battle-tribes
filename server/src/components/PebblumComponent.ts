import { ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface PebblumComponentParams {
   targetEntityID: number;
}

export class PebblumComponent {
   public targetEntityID: number;
   
   constructor(params: PebblumComponentParams) {
      this.targetEntityID = params.targetEntityID
   }
}

export const PebblumComponentArray = new ComponentArray<PebblumComponent>(ServerComponentType.pebblum, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(): void {}