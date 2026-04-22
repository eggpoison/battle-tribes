import { ServerComponentType } from "webgl-test-shared";
import _ServerComponentArray from "../ServerComponentArray";
import { registerServerComponentArray } from "../component-registry";

export interface EnergyStoreComponentData {}

export interface EnergyStoreComponent {}

declare module "../component-registry" {
   interface ServerComponentRegistry extends RegisterServerComponent<ServerComponentType.energyStore, _EnergyStoreComponentArray, EnergyStoreComponentData> {}
}

class _EnergyStoreComponentArray extends _ServerComponentArray<EnergyStoreComponent, EnergyStoreComponentData, never> {
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