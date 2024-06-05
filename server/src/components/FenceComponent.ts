import { FenceComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export class FenceComponent {}

export const FenceComponentArray = new ComponentArray<ServerComponentType.fence, FenceComponent>(true, {
   serialise: serialise
});

function serialise(): FenceComponentData {
   return {
      componentType: ServerComponentType.fence
   };
}