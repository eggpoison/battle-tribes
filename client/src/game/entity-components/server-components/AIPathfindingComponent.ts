import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface AIPathfindingComponentData {}

export class AIPathfindingComponent {}

export const AIPathfindingComponentArray = new ServerComponentArray<AIPathfindingComponent, AIPathfindingComponentData, never>(ServerComponentType.aiPathfinding, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): AIPathfindingComponentData {
   return {};
}

function createComponent(): AIPathfindingComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}