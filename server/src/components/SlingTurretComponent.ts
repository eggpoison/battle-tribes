import { ServerComponentType } from "../../../shared/dist/components.js";
import { ComponentArray } from "./ComponentArray.js";

export class SlingTurretComponent {}

export const SlingTurretComponentArray = new ComponentArray<SlingTurretComponent>(ServerComponentType.slingTurret, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}