import { ServerComponentType } from "../../../shared/dist/components.js";
import { ComponentArray } from "./ComponentArray.js";

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