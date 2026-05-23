import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class SlurbTorchComponent {}

export const SlurbTorchComponentArray = new ComponentArray<SlurbTorchComponent>(ServerComponentType.slurbTorch, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}