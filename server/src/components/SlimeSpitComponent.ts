import { ServerComponentType, SlimeSpitComponentData } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class SlimeSpitComponent {
   public readonly size: number;

   constructor(size: number) {
      this.size = size;
   }
}

export const SlimeSpitComponentArray = new ComponentArray<ServerComponentType.slimeSpit, SlimeSpitComponent>(true, {
   serialise: serialise
});

function serialise(entityID: number): SlimeSpitComponentData {
   const slimeSpitComponent = SlimeSpitComponentArray.getComponent(entityID);
   return {
      componentType: ServerComponentType.slimeSpit,
      size: slimeSpitComponent.size
   };
}