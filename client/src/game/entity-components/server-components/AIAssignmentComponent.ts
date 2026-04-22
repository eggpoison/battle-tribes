import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIAssignmentComponentData {}

export interface AIAssignmentComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiAssignment, _AIAssignmentComponentArray, AIAssignmentComponentData> {}
}

class _AIAssignmentComponentArray extends _ServerComponentArray<AIAssignmentComponent, AIAssignmentComponentData> {
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