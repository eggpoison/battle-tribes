import { ServerComponentType } from "../../../../../shared/src/components";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface EnergyStomachComponentData {}

export interface EnergyStomachComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.energyStomach, _EnergyStomachComponentArray> {}
}

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