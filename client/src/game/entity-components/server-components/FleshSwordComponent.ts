import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface FleshSwordComponentData {}

export interface FleshSwordComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.fleshSwordItem, typeof FleshSwordComponentArray> {}
}

export const FleshSwordComponentArray = registerServerComponentArray(
   ServerComponentType.fleshSwordItem,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): FleshSwordComponentData {
   return {};
}

function createComponent(): FleshSwordComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}