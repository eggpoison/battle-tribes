import { ServerComponentType } from "battletribes-shared";
import { ComponentArray } from "./ComponentArray.js";

export class DesertShrubComponent {}

export const DesertShrubComponentArray = new ComponentArray<DesertShrubComponent>(ServerComponentType.desertShrub, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}