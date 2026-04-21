import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface AIAssignmentComponentData {}

export interface AIAssignmentComponent {}

class _AIAssignmentComponentArray extends ServerComponentArray<AIAssignmentComponent, AIAssignmentComponentData> {
   public decodeData(): AIAssignmentComponentData {
      return {};
   }

   public createComponent(): AIAssignmentComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const AIAssignmentComponentArray = registerServerComponentArray(ServerComponentType.aiAssignment, _AIAssignmentComponentArray, true);