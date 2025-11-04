import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EnergyStoreComponentData {}

export interface EnergyStoreComponent {}

export const EnergyStoreComponentArray = new ServerComponentArray<EnergyStoreComponent, EnergyStoreComponentData, never>(ServerComponentType.energyStore, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): EnergyStoreComponentData {
   return {};
}

function createComponent(): EnergyStoreComponentData {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}