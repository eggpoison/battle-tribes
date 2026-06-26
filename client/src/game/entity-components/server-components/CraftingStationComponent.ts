import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface CraftingStationComponentData {}

export interface CraftingStationComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.craftingStation, typeof CraftingStationComponentArray> {}
}

export const CraftingStationComponentArray = registerServerComponentArray(
   ServerComponentType.craftingStation,
   new ServerComponentArray(true, createComponent, getMaxRenderParts, decodeData)
);

function decodeData(): CraftingStationComponentData {
   return {};
}

function createComponent(): CraftingStationComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}

export function createCraftingStationComponentData(): CraftingStationComponentData {
   return {};
}