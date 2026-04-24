import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface FleshSwordComponentData {}

export interface FleshSwordComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fleshSwordItem, _FleshSwordComponentArray> {}
}

class _FleshSwordComponentArray extends _ServerComponentArray<FleshSwordComponent, FleshSwordComponentData> {
   public decodeData(): FleshSwordComponentData {
      return {};
   }

   public createComponent(): FleshSwordComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const FleshSwordComponentArray = registerServerComponentArray(ServerComponentType.fleshSwordItem, _FleshSwordComponentArray, true);