import { ServerComponentType } from "battletribes-shared/components";
import ServerComponentArray from "../ServerComponentArray";

export interface CraftingStationComponentData {}

export interface CraftingStationComponent {}

export const CraftingStationComponentArray = new ServerComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, createComponent, getMaxRenderParts, decodeData);

export function createCraftingStationComponentData(): CraftingStationComponentData {
   return {};
}

function decodeData(): CraftingStationComponentData {
   return {};
}

function createComponent(): CraftingStationComponent {
   return {};
}

function getMaxRenderParts(): number {
   return 0;
}