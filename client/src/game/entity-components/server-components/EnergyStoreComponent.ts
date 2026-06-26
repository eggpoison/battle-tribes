import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface EnergyStoreComponentData {}

export interface EnergyStoreComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.energyStore, typeof EnergyStoreComponentArray> {}
}

export const EnergyStoreComponentArray = registerServerComponentArray(
   ServerComponentType.energyStore,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): EnergyStoreComponentData {
   return {};
}

function createComponent(): EnergyStoreComponentData {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}