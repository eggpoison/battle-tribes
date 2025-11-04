import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface FleshSwordComponentData {}

export interface FleshSwordComponent {}

export const FleshSwordComponentArray = new ServerComponentArray<FleshSwordComponent, FleshSwordComponentData>(ServerComponentType.fleshSwordItem, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): FleshSwordComponentData {
   return {};
}

function createComponent(): FleshSwordComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}