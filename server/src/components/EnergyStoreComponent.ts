import { ServerComponentType } from "../../../shared/src/components";
import { ComponentArray } from "./ComponentArray";

/** Stores some intrinsic amount of energy that a creature has in their body. */
export class EnergyStoreComponent {
   public readonly energyAmount: number;
   
   constructor(energyAmount: number) {
      this.energyAmount = energyAmount;
   }
}

export const EnergyStoreComponentArray = new ComponentArray<EnergyStoreComponent>(ServerComponentType.energyStore, true, getDataLength, addDataToPacket);

function getDataLength(): number {
   return 0;
}

function addDataToPacket(): void {}