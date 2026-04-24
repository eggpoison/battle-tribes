import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIPathfindingComponentData {}

export class AIPathfindingComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiPathfinding, _AIPathfindingComponentArray> {}
}

class _AIPathfindingComponentArray extends _ServerComponentArray<AIPathfindingComponent, AIPathfindingComponentData> {
   public decodeData(): AIPathfindingComponentData {
      return {};
   }

   public createComponent(): AIPathfindingComponent {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const AIPathfindingComponentArray = registerServerComponentArray(ServerComponentType.aiPathfinding, _AIPathfindingComponentArray, true);