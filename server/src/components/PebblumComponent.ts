import { PebblumComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
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
   serialise: serialise
});

function serialise(): PebblumComponentData {
   return {
      componentType: ServerComponentType.pebblum
   };
}