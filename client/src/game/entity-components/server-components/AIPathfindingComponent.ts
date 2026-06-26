import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIPathfindingComponentData {}

export interface AIPathfindingComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiPathfinding, typeof AIPathfindingComponentArray> {}
}

export const AIPathfindingComponentArray = registerServerComponentArray(
   ServerComponentType.aiPathfinding,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): AIPathfindingComponentData {
   return {};
}

function createComponent(): AIPathfindingComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}