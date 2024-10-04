import { ServerComponentType } from "../../../shared/src/components";
import { EntityID } from "../../../shared/src/entities";
import { Packet } from "../../../shared/src/packets";
import { randFloat, randInt } from "../../../shared/src/utils";
import { ComponentArray } from "./ComponentArray";

export interface GuardianGemFragmentProjectileComponentParams {}

export class GuardianGemFragmentProjectileComponent implements GuardianGemFragmentProjectileComponentParams {
   public readonly fragmentShape = randInt(0, 2);
   public readonly gemType = randInt(0, 2);
   public readonly tintMultiplier = randFloat(0.5, 1);
}

export const GuardianGemFragmentProjectileComponentArray = new ComponentArray<GuardianGemFragmentProjectileComponent>(ServerComponentType.guardianGemFragmentProjectile, true, {
   getDataLength: getDataLength,
   addDataToPacket: addDataToPacket
});

function getDataLength(): number {
   return 4 * Float32Array.BYTES_PER_ELEMENT;
}

function addDataToPacket(packet: Packet, entity: EntityID): void {
   const guardianGemFragmentProjectileComponent = GuardianGemFragmentProjectileComponentArray.getComponent(entity);
   packet.addNumber(guardianGemFragmentProjectileComponent.fragmentShape);
   packet.addNumber(guardianGemFragmentProjectileComponent.gemType);
   packet.addNumber(guardianGemFragmentProjectileComponent.tintMultiplier);
}