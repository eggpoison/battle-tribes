import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface EnergyStomachComponentData {}

export interface EnergyStomachComponent {}

class _EnergyStomachComponentArray extends ServerComponentArray<EnergyStomachComponent, EnergyStomachComponentData> {
   public decodeData(): EnergyStomachComponentData {
      return {};
   }

   public createComponent(): EnergyStomachComponentData {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const EnergyStomachComponentArray = registerServerComponentArray(ServerComponentType.energyStomach, _EnergyStomachComponentArray, true);