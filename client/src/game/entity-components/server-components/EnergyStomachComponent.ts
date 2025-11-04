import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";

export interface EnergyStomachComponentData {}

export interface EnergyStomachComponent {}

export const EnergyStomachComponentArray = new ServerComponentArray<EnergyStomachComponent, EnergyStomachComponentData, never>(ServerComponentType.energyStomach, true, createComponent, getMaxRenderParts, decodeData);

function decodeData(): EnergyStomachComponentData {
   return {};
}

function createComponent(): EnergyStomachComponentData {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}