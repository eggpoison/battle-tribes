import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class MithrilAnvilComponent {}

export const MithrilAnvilComponentArray = new ComponentArray<MithrilAnvilComponent>(ServerComponentType.mithrilAnvil, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}