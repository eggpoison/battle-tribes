import { FenceComponentData, ServerComponentType } from "webgl-test-shared/dist/components";
import { ComponentArray } from "./ComponentArray";

export interface FenceComponentParams {}

export class FenceComponent {}

export const FenceComponentArray = new ComponentArray<FenceComponent>(ServerComponentType.fence, true, {
   serialise: serialise
});

function serialise(): FenceComponentData {
   return {
      componentType: ServerComponentType.fence
   };
}