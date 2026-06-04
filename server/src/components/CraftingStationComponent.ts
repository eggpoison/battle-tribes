import { ServerComponentType } from "../../../shared/dist/components.js";
import { ComponentArray } from "./ComponentArray.js";

// @Cleanup: is this component necessary/used at all.

export class CraftingStationComponent {}

export const CraftingStationComponentArray = new ComponentArray<CraftingStationComponent>(ServerComponentType.craftingStation, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}