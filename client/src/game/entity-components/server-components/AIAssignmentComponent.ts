import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface AIAssignmentComponentData {}

export interface AIAssignmentComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.aiAssignment, typeof AIAssignmentComponentArray> {}
}

export const AIAssignmentComponentArray = registerServerComponentArray(
   ServerComponentType.aiAssignment,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): AIAssignmentComponentData {
   return {};
}

function createComponent(): AIAssignmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}