import { PebblumComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface PebblumComponentParams {
   readonly targetEntityID: number;
}

export class PebblumComponent {
   public targetEntityID: number;
   
   constructor(params: PebblumComponentParams) {
      this.targetEntityID = params.targetEntityID
   }
}

export const PebblumComponentArray = new ComponentArray<ServerComponentType.pebblum, PebblumComponent>(true, {
   serialise: serialise
});

function serialise(): PebblumComponentData {
   return {
      componentType: ServerComponentType.pebblum
   };
}