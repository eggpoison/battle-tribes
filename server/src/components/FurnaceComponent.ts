import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class FurnaceComponent {}

export const FurnaceComponentArray = new ComponentArray<FurnaceComponent>(ServerComponentType.furnace, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}