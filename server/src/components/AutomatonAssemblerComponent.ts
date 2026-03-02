import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

// @Cleanup: useless component?

export class AutomatonAssemblerComponent {}

export const AutomatonAssemblerComponentArray = new ComponentArray<AutomatonAssemblerComponent>(ServerComponentType.automatonAssembler, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}