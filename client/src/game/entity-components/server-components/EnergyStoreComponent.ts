import { ServerComponentType } from "webgl-test-shared";
import ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-register";

export interface EnergyStoreComponentData {}

export interface EnergyStoreComponent {}

class _EnergyStoreComponentArray extends ServerComponentArray<EnergyStoreComponent, EnergyStoreComponentData, never> {
   public decodeData(): EnergyStoreComponentData {
      return {};
   }

   public createComponent(): EnergyStoreComponentData {
      return {};
   }

   public getMaxRenderParts(): number {
      return 0;
   }
}

export const EnergyStoreComponentArray = registerServerComponentArray(ServerComponentType.energyStore, _EnergyStoreComponentArray, true);