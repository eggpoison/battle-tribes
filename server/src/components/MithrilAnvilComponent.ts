import { ServerComponentType } from "../../../shared/dist/components.js";
import { ComponentArray } from "./ComponentArray.js";

export class MithrilAnvilComponent {}

export const MithrilAnvilComponentArray = new ComponentArray<MithrilAnvilComponent>(ServerComponentType.mithrilAnvil, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}