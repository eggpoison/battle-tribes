import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";

export interface AIAssignmentComponentData {}

export interface AIAssignmentComponent {}

export const AIAssignmentComponentArray = new ServerComponentArray<AIAssignmentComponent, AIAssignmentComponentData, never>(ServerComponentType.aiAssignment, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): AIAssignmentComponentData {
   return {};
}

function createComponent(): AIAssignmentComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}