import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface FleshSwordComponentData {}

export interface FleshSwordComponent {}

class _FleshSwordComponentArray extends ServerComponentArray<FleshSwordComponent, FleshSwordComponentData> {
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