import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface AIPathfindingComponentData {}

export class AIPathfindingComponent {}

class _AIPathfindingComponentArray extends ServerComponentArray<AIPathfindingComponent, AIPathfindingComponentData> {
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