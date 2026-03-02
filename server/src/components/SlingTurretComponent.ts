import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

export class SlingTurretComponent {}

export const SlingTurretComponentArray = new ComponentArray<SlingTurretComponent>(ServerComponentType.slingTurret, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}