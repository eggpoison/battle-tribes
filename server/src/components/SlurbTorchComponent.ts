import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class SlurbTorchComponent {}

export const SlurbTorchComponentArray = new ComponentArray<SlurbTorchComponent>(ServerComponentType.slurbTorch, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}