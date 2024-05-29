import { PebblumComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class PebblumComponent {
   public targetEntityID: number;
   
   constructor(targetEntityID: number) {
      this.targetEntityID = targetEntityID
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