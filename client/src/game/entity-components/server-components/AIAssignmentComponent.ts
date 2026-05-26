import { ServerComponentType } from "../../../../../shared/src/components";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIAssignmentComponentData {}

export interface AIAssignmentComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiAssignment, AIAssignmentComponentArray> {}
}

class AIAssignmentComponentArray extends _ServerComponentArray<AIAssignmentComponent, AIAssignmentComponentData> {
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

export const aiAssignmentComponentArray = registerServerComponentArray(ServerComponentType.aiAssignment, AIAssignmentComponentArray, true);