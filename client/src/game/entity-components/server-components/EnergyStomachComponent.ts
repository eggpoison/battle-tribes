import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface EnergyStomachComponentData {}

export interface EnergyStomachComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.energyStomach, typeof EnergyStomachComponentArray> {}
}

export const EnergyStomachComponentArray = registerServerComponentArray(
   ServerComponentType.energyStomach,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): EnergyStomachComponentData {
   return {};
}

function createComponent(): EnergyStomachComponentData {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}