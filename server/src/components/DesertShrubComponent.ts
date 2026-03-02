import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class DesertShrubComponent {}

export const DesertShrubComponentArray = new ComponentArray<DesertShrubComponent>(ServerComponentType.desertShrub, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}